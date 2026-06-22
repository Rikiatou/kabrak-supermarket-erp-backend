import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // Agrège toutes les notifications importantes
  async getNotifications() {
    const now = new Date();
    const items: Array<{
      id: string;
      type: 'stockout' | 'near_expiry' | 'expired' | 'cash_diff' | 'revenue_goal' | 'invoice_overdue' | 'markdown_suggestion';
      priority: 'critical' | 'high' | 'medium' | 'low';
      title: string;
      message: string;
      productId?: string;
      shiftId?: string;
      invoiceId?: string;
      action?: string;
      actionUrl?: string;
      createdAt: string;
    }> = [];

    // 1. Ruptures stock (stock = 0)
    const outOfStock = await this.prisma.product.findMany({
      where: { isActive: true, stock: 0 },
      select: { id: true, name: true, sku: true, unit: true, minStock: true },
      take: 10,
    });
    outOfStock.forEach((p) => {
      items.push({
        id: `stockout-${p.id}`,
        type: 'stockout',
        priority: 'critical',
        title: `Rupture: ${p.name}`,
        message: `${p.name} (${p.sku}) est en rupture de stock. Stock minimum: ${p.minStock}.`,
        productId: p.id,
        action: 'Réapprovisionner',
        actionUrl: '/stocks',
        createdAt: now.toISOString(),
      });
    });

    // 2. Stock critique (stock <= minStock * 0.3 mais > 0)
    const lowStock = await this.prisma.product.findMany({
      where: {
        isActive: true,
        stock: { gt: 0, lte: 3 }, // Simplifié: stock <= 3
      },
      select: { id: true, name: true, sku: true, stock: true, minStock: true, unit: true },
      take: 10,
    });
    lowStock.forEach((p) => {
      items.push({
        id: `lowstock-${p.id}`,
        type: 'stockout',
        priority: 'high',
        title: `Stock critique: ${p.name}`,
        message: `${p.name}: ${p.stock} ${p.unit} restant(s) (min: ${p.minStock}).`,
        productId: p.id,
        action: 'Réapprovisionner',
        actionUrl: '/stocks',
        createdAt: now.toISOString(),
      });
    });

    // 3. Produits expirés
    const expired = await this.prisma.product.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 },
        expiryDate: { lt: now },
        markdownPrice: null, // Pas déjà en markdown
      },
      select: { id: true, name: true, sku: true, stock: true, expiryDate: true },
      take: 10,
    });
    expired.forEach((p) => {
      items.push({
        id: `expired-${p.id}`,
        type: 'expired',
        priority: 'critical',
        title: `Produit expiré: ${p.name}`,
        message: `${p.name} a expiré le ${new Date(p.expiryDate!).toLocaleDateString('fr-FR')}. Stock: ${p.stock}. Appliquer un markdown.`,
        productId: p.id,
        action: 'Appliquer markdown',
        actionUrl: '/stocks',
        createdAt: now.toISOString(),
      });
    });

    // 4. Péremption proche (3 et 7 jours)
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const expiring3 = await this.prisma.product.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 },
        expiryDate: { gte: now, lte: threeDays },
        markdownPrice: null,
      },
      select: { id: true, name: true, stock: true, expiryDate: true },
      take: 10,
    });
    expiring3.forEach((p) => {
      items.push({
        id: `expiry3-${p.id}`,
        type: 'near_expiry',
        priority: 'high',
        title: `Expire dans 3 jours: ${p.name}`,
        message: `${p.name} expire le ${new Date(p.expiryDate!).toLocaleDateString('fr-FR')}. Stock: ${p.stock}.`,
        productId: p.id,
        action: 'Voir le produit',
        actionUrl: '/stocks',
        createdAt: now.toISOString(),
      });
    });

    const expiring7 = await this.prisma.product.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 },
        expiryDate: { gt: threeDays, lte: sevenDays },
        markdownPrice: null,
      },
      select: { id: true, name: true, stock: true, expiryDate: true },
      take: 10,
    });
    expiring7.forEach((p) => {
      items.push({
        id: `expiry7-${p.id}`,
        type: 'near_expiry',
        priority: 'medium',
        title: `Expire dans 7 jours: ${p.name}`,
        message: `${p.name} expire le ${new Date(p.expiryDate!).toLocaleDateString('fr-FR')}. Stock: ${p.stock}.`,
        productId: p.id,
        action: 'Voir le produit',
        actionUrl: '/stocks',
        createdAt: now.toISOString(),
      });
    });

    // 5. Écarts de caisse (shifts fermés aujourd'hui avec différence != 0)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const cashDiffs = await this.prisma.shift.findMany({
      where: {
        status: 'closed',
        closedAt: { gte: todayStart },
        difference: { not: 0 },
      },
      take: 10,
    });
    cashDiffs.forEach((s) => {
      const diff = s.difference || 0;
      items.push({
        id: `cashdiff-${s.id}`,
        type: 'cash_diff',
        priority: diff < -1000 ? 'critical' : diff < 0 ? 'high' : 'low',
        title: `Écart de caisse: ${s.registerName || 'Caisse'}`,
        message: `${s.registerName || 'Caisse'}: écart de ${diff >= 0 ? '+' : ''}${diff} FCFA par ${s.employeeName || 'N/A'}.`,
        shiftId: s.id,
        action: 'Voir le shift',
        actionUrl: '/caisses',
        createdAt: s.closedAt?.toISOString() || now.toISOString(),
      });
    });

    // 6. Factures impayées/en retard
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        status: { in: ['pending', 'partial', 'overdue'] },
        dueDate: { lt: now },
      },
      select: { id: true, number: true, clientName: true, total: true, paidAmount: true, dueDate: true },
      take: 10,
    });
    overdueInvoices.forEach((inv) => {
      const balance = inv.total - (inv.paidAmount || 0);
      items.push({
        id: `invoice-${inv.id}`,
        type: 'invoice_overdue',
        priority: 'high',
        title: `Facture en retard: ${inv.number}`,
        message: `${inv.number} (${inv.clientName}): ${balance} FCFA en attente. Échéance: ${new Date(inv.dueDate).toLocaleDateString('fr-FR')}.`,
        invoiceId: inv.id,
        action: 'Voir la facture',
        actionUrl: '/factures',
        createdAt: now.toISOString(),
      });
    });

    // 7. Objectif CA (si > 500k FCFA aujourd'hui)
    const todayRevenue = await this.prisma.transaction.aggregate({
      where: {
        date: { gte: todayStart },
        status: 'completed',
      },
      _sum: { total: true },
    });
    const revenue = todayRevenue._sum.total || 0;
    const DAILY_GOAL = 500000; // 500k FCFA
    if (revenue >= DAILY_GOAL) {
      items.push({
        id: `revenue-goal-${todayStart.toISOString().split('T')[0]}`,
        type: 'revenue_goal',
        priority: 'low',
        title: 'Objectif CA atteint!',
        message: `Le chiffre d'affaires du jour atteint ${revenue} FCFA (objectif: ${DAILY_GOAL} FCFA).`,
        action: 'Voir les rapports',
        actionUrl: '/rapports',
        createdAt: now.toISOString(),
      });
    }

    // 8. Suggestions de markdown (produits qui devraient être en promo)
    const markdownCandidates = await this.prisma.product.count({
      where: {
        isActive: true,
        stock: { gt: 0 },
        markdownPrice: null,
        expiryDate: { lte: sevenDays },
      },
    });
    if (markdownCandidates > 0) {
      items.push({
        id: `markdown-suggestion-${now.toISOString().split('T')[0]}`,
        type: 'markdown_suggestion',
        priority: 'medium',
        title: `${markdownCandidates} produit(s) à markdown`,
        message: `${markdownCandidates} produit(s) expirant bientôt sans markdown. L'IA suggère des remises.`,
        action: 'Voir les suggestions',
        actionUrl: '/ia',
        createdAt: now.toISOString(),
      });
    }

    // Trier par priorité
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    const summary = {
      total: items.length,
      critical: items.filter((i) => i.priority === 'critical').length,
      high: items.filter((i) => i.priority === 'high').length,
      medium: items.filter((i) => i.priority === 'medium').length,
      low: items.filter((i) => i.priority === 'low').length,
      revenue: revenue,
      revenueGoal: DAILY_GOAL,
      revenueProgress: Math.min(Math.round((revenue / DAILY_GOAL) * 100), 100),
    };

    return { summary, items };
  }
}
