import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AiService {
  constructor(private prisma: PrismaService) {}

  // Prévision de stock: calcule la vélocité de vente et prévoit quand le stock sera épuisé
  async getStockForecast() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, stock: { gt: 0 } },
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        stock: true,
        minStock: true,
        unit: true,
        costPrice: true,
        price: true,
      },
    });

    // Récupérer les ventes des 30 derniers jours pour calculer la vélocité
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesData = await this.prisma.transactionItem.groupBy({
      by: ['productId'],
      where: {
        transaction: {
          date: { gte: thirtyDaysAgo },
          status: 'completed',
        },
      },
      _sum: { quantity: true },
    });

    const salesMap = new Map<string, number>();
    salesData.forEach((s) => salesMap.set(s.productId, s._sum.quantity || 0));

    const forecasts = products.map((product) => {
      const sold30Days = salesMap.get(product.id) || 0;
      const dailyVelocity = sold30Days / 30;
      const daysUntilOut = dailyVelocity > 0 ? Math.floor(product.stock / dailyVelocity) : 999;
      const recommendedOrder = dailyVelocity > 0 ? Math.ceil(dailyVelocity * 14) : 0; // 14 jours de stock

      let urgency: 'critical' | 'warning' | 'ok' | 'overstock' = 'ok';
      if (daysUntilOut <= 3) urgency = 'critical';
      else if (daysUntilOut <= 7) urgency = 'warning';
      else if (daysUntilOut > 60 && dailyVelocity > 0) urgency = 'overstock';

      return {
        ...product,
        sold30Days,
        dailyVelocity: Math.round(dailyVelocity * 10) / 10,
        daysUntilOut: daysUntilOut === 999 ? null : daysUntilOut,
        recommendedOrder,
        urgency,
      };
    });

    // Trier par urgence puis par jours restants
    const urgencyOrder = { critical: 0, warning: 1, ok: 2, overstock: 3 };
    forecasts.sort((a, b) => {
      const uDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (uDiff !== 0) return uDiff;
      return (a.daysUntilOut ?? 999) - (b.daysUntilOut ?? 999);
    });

    const summary = {
      total: forecasts.length,
      critical: forecasts.filter((f) => f.urgency === 'critical').length,
      warning: forecasts.filter((f) => f.urgency === 'warning').length,
      overstock: forecasts.filter((f) => f.urgency === 'overstock').length,
      recommendedOrdersValue: forecasts
        .filter((f) => f.recommendedOrder > 0)
        .reduce((s, f) => s + f.recommendedOrder * f.costPrice, 0),
    };

    return { summary, forecasts: forecasts.slice(0, 50) };
  }

  // Recommandations intelligentes
  async getRecommendations() {
    const forecast = await this.getStockForecast();

    const recommendations: Array<{
      type: string;
      priority: 'high' | 'medium' | 'low';
      title: string;
      message: string;
      productId?: string;
      action?: string;
    }> = [];

    // 1. Produits en rupture imminente
    forecast.forecasts
      .filter((f) => f.urgency === 'critical')
      .slice(0, 5)
      .forEach((f) => {
        recommendations.push({
          type: 'stockout',
          priority: 'high',
          title: `Rupture imminente: ${f.name}`,
          message: `Le stock de ${f.name} sera épuisé dans ${f.daysUntilOut} jour(s). Commander ${f.recommendedOrder} ${f.unit} recommandé.`,
          productId: f.id,
          action: `Commander ${f.recommendedOrder} ${f.unit}`,
        });
      });

    // 2. Surstock
    forecast.forecasts
      .filter((f) => f.urgency === 'overstock')
      .slice(0, 3)
      .forEach((f) => {
        recommendations.push({
          type: 'overstock',
          priority: 'low',
          title: `Surstock détecté: ${f.name}`,
          message: `${f.name} a un stock pour ${f.daysUntilOut} jours. Considérer une promotion pour accélérer les ventes.`,
          productId: f.id,
          action: 'Lancer une promotion',
        });
      });

    // 3. Alertes expiration
    const expiringProducts = await this.prisma.product.findMany({
      where: {
        expiryDate: {
          lte: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          gte: new Date(),
        },
        stock: { gt: 0 },
      },
      select: { id: true, name: true, expiryDate: true, stock: true, price: true },
      take: 5,
    });

    expiringProducts.forEach((p) => {
      const daysLeft = Math.ceil((new Date(p.expiryDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      recommendations.push({
        type: 'expiry',
        priority: daysLeft <= 7 ? 'high' : 'medium',
        title: `Expiration proche: ${p.name}`,
        message: `${p.name} expire dans ${daysLeft} jour(s). Stock: ${p.stock}. Considérer une remise.`,
        productId: p.id,
        action: 'Appliquer une remise',
      });
    });

    // 4. Produits les plus rentables
    const topMargin = await this.prisma.product.findMany({
      where: { isActive: true, stock: { gt: 0 } },
      select: { id: true, name: true, costPrice: true, price: true, category: true },
      take: 100,
    });

    const withMargin = topMargin
      .map((p) => ({
        ...p,
        margin: p.price - p.costPrice,
        marginRate: ((p.price - p.costPrice) / p.price) * 100,
      }))
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 3);

    withMargin.forEach((p) => {
      recommendations.push({
        type: 'profit',
        priority: 'low',
        title: `Top marge: ${p.name}`,
        message: `${p.name} a une marge de ${p.marginRate.toFixed(1)}% (${p.margin} FCFA/unité). Mettre en avant.`,
        productId: p.id,
        action: 'Mettre en avant',
      });
    });

    return recommendations.sort((a, b) => {
      const pOrder = { high: 0, medium: 1, low: 2 };
      return pOrder[a.priority] - pOrder[b.priority];
    });
  }

  // Statistiques de ventes pour l'IA
  async getSalesInsights() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [totalRevenue, transactionCount, topProducts] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { date: { gte: sevenDaysAgo }, status: 'completed' },
        _sum: { total: true },
      }),
      this.prisma.transaction.count({
        where: { date: { gte: sevenDaysAgo }, status: 'completed' },
      }),
      this.prisma.transactionItem.groupBy({
        by: ['productId'],
        where: { transaction: { date: { gte: sevenDaysAgo }, status: 'completed' } },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      weeklyRevenue: totalRevenue._sum.total || 0,
      weeklyTransactions: transactionCount,
      avgBasket: transactionCount > 0 ? (totalRevenue._sum.total || 0) / transactionCount : 0,
      topProducts: topProducts.slice(0, 5),
    };
  }

  // Suggestions de markdown (destockage, péremption, surstock)
  async getMarkdownSuggestions() {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Produits candidats: stock > 0, pas déjà en markdown, avec expiryDate dans les 60 prochains jours OU surstock
    const candidates = await this.prisma.product.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 },
        markdownPrice: null,
        OR: [
          // Produits expirant dans les 60 prochains jours
          {
            expiryDate: {
              lte: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
              gte: now,
            },
          },
          // Produits déjà expirés (urgence maximale)
          { expiryDate: { lt: now } },
        ],
      },
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        stock: true,
        price: true,
        costPrice: true,
        unit: true,
        expiryDate: true,
      },
    });

    // Récupérer la vélocité de vente des 30 derniers jours
    const salesData = await this.prisma.transactionItem.groupBy({
      by: ['productId'],
      where: {
        transaction: {
          date: { gte: thirtyDaysAgo },
          status: 'completed',
        },
      },
      _sum: { quantity: true },
    });

    const salesMap = new Map<string, number>();
    salesData.forEach((s) => salesMap.set(s.productId, s._sum.quantity || 0));

    const suggestions = candidates.map((product) => {
      const sold30Days = salesMap.get(product.id) || 0;
      const dailyVelocity = sold30Days / 30;
      const daysToExpiry = product.expiryDate
        ? Math.ceil((new Date(product.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Déterminer la raison et le pourcentage de markdown
      let reason: 'expiry' | 'near_expiry' | 'clearance' = 'near_expiry';
      let markdownPercent = 0;
      let priority: 'critical' | 'high' | 'medium' = 'medium';

      if (daysToExpiry !== null) {
        if (daysToExpiry <= 0) {
          // Déjà expiré — markdown agressif
          reason = 'expiry';
          markdownPercent = 80;
          priority = 'critical';
        } else if (daysToExpiry <= 3) {
          reason = 'expiry';
          markdownPercent = 60;
          priority = 'critical';
        } else if (daysToExpiry <= 7) {
          reason = 'expiry';
          markdownPercent = 40;
          priority = 'high';
        } else if (daysToExpiry <= 15) {
          reason = 'near_expiry';
          markdownPercent = 25;
          priority = 'high';
        } else if (daysToExpiry <= 30) {
          reason = 'near_expiry';
          markdownPercent = 15;
          priority = 'medium';
        } else {
          // 30-60 jours: promo légère si surstock
          const daysUntilOut = dailyVelocity > 0 ? product.stock / dailyVelocity : 999;
          if (daysUntilOut > daysToExpiry) {
            // Plus de stock que ce qu'on peut vendre avant expiration
            reason = 'clearance';
            markdownPercent = 10;
            priority = 'medium';
          } else {
            return null; // Pas besoin de markdown
          }
        }
      }

      // Ajuster le markdown si la vélocité est très basse (ne se vend pas)
      if (dailyVelocity < 0.5 && daysToExpiry !== null && daysToExpiry <= 30) {
        markdownPercent = Math.min(markdownPercent + 15, 90);
      }

      const markdownPrice = Math.round(product.price * (1 - markdownPercent / 100));
      const potentialLoss = (product.price - markdownPrice) * product.stock;

      return {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        stock: product.stock,
        price: product.price,
        costPrice: product.costPrice,
        unit: product.unit,
        expiryDate: product.expiryDate,
        daysToExpiry,
        sold30Days,
        dailyVelocity: Math.round(dailyVelocity * 10) / 10,
        reason,
        markdownPercent,
        suggestedMarkdownPrice: markdownPrice,
        potentialLoss,
        priority,
      };
    }).filter((s): s is NonNullable<typeof s> => s !== null);

    // Trier par priorité puis par jours avant expiration
    const priorityOrder = { critical: 0, high: 1, medium: 2 };
    suggestions.sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return (a.daysToExpiry ?? 999) - (b.daysToExpiry ?? 999);
    });

    const summary = {
      total: suggestions.length,
      critical: suggestions.filter((s) => s.priority === 'critical').length,
      high: suggestions.filter((s) => s.priority === 'high').length,
      medium: suggestions.filter((s) => s.priority === 'medium').length,
      totalPotentialLoss: suggestions.reduce((sum, s) => sum + s.potentialLoss, 0),
    };

    return { summary, suggestions: suggestions.slice(0, 30) };
  }
}
