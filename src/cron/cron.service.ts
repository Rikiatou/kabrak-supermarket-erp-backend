import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private prisma: PrismaService) {}

  // Toutes les heures: nettoyer les markdowns expirés
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredMarkdowns() {
    const now = new Date();

    const expired = await this.prisma.product.findMany({
      where: {
        markdownPrice: { not: null },
        markdownExpiresAt: { lt: now },
      },
      select: { id: true, name: true, markdownPrice: true, price: true },
    });

    if (expired.length === 0) return;

    await this.prisma.product.updateMany({
      where: {
        id: { in: expired.map((p) => p.id) },
      },
      data: {
        markdownPrice: null,
        markdownReason: null,
        markdownNote: null,
        markdownStartsAt: null,
        markdownExpiresAt: null,
      },
    });

    this.logger.log(
      `🧹 ${expired.length} markdown(s) expiré(s) nettoyé(s): ${expired.map((p) => p.name).join(', ')}`,
    );
  }

  // Tous les jours à 6h du matin: marquer les factures en retard
  @Cron('0 6 * * *')
  async markOverdueInvoices() {
    const now = new Date();

    const result = await this.prisma.invoice.updateMany({
      where: {
        status: { in: ['pending', 'partial', 'sent'] },
        dueDate: { lt: now },
      },
      data: {
        status: 'overdue',
      },
    });

    if (result.count > 0) {
      this.logger.log(`⏰ ${result.count} facture(s) marquée(s) en retard`);
    }
  }

  // Tous les jours à minuit: calculer le balance des factures
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateInvoiceBalances() {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: { in: ['partial', 'pending', 'overdue'] },
      },
      select: { id: true, total: true, paidAmount: true },
    });

    for (const inv of invoices) {
      const balance = inv.total - (inv.paidAmount || 0);
      await this.prisma.invoice.update({
        where: { id: inv.id },
        data: { balance },
      });
    }

    if (invoices.length > 0) {
      this.logger.log(`💰 ${invoices.length} balance(s) de facture(s) recalculé(s)`);
    }
  }
}
