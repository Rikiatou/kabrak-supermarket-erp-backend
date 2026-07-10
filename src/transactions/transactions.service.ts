import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  // Créer une vente (OFFLINE-FIRST)
  // Enregistrement local immédiat + sync plus tard
  async create(createTransactionDto: CreateTransactionDto) {
    // Générer numéro de transaction
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.transaction.count({
      where: {
        date: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
        },
      },
    });
    const transactionNumber = `TXN-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    // Transaction dans une transaction DB (atomicité)
    const transaction = await this.prisma.$transaction(async (prisma) => {
      // 1. Créer la transaction
      const tx = await prisma.transaction.create({
        data: {
          transactionNumber,
          cashierId: createTransactionDto.cashierId,
          registerId: createTransactionDto.registerId,
          subtotal: createTransactionDto.subtotal,
          discount: createTransactionDto.discount || 0,
          tax: createTransactionDto.tax,
          total: createTransactionDto.total,
          paymentMethod: createTransactionDto.paymentMethod,
          cashGiven: createTransactionDto.cashGiven,
          change: createTransactionDto.change,
          splitBreakdown: createTransactionDto.splitBreakdown || null,
          customerId: createTransactionDto.customerId,
          status: 'completed',
          syncStatus: 'pending', // À synchroniser avec le cloud
          items: {
            create: createTransactionDto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount || 0,
              tax: item.tax,
              total: item.total,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          cashier: true,
        },
      });

      // 2. Mettre à jour le stock pour chaque article
      for (const item of createTransactionDto.items) {
        // Décrémenter le stock
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        // Créer un mouvement de stock
        await prisma.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'out',
            quantity: -item.quantity,
            reason: 'sale',
            reference: tx.transactionNumber,
            notes: item.discount > 0 ? `Remise article: ${item.discount}` : undefined,
            syncStatus: 'pending',
          },
        });
      }

      // 3. Mettre à jour les points fidélité si client
      if (createTransactionDto.customerId) {
        const pointsEarned = Math.floor(createTransactionDto.total / 100); // 1 point = 100 FCFA
        await prisma.customer.update({
          where: { id: createTransactionDto.customerId },
          data: {
            points: { increment: pointsEarned },
            totalSpent: { increment: createTransactionDto.total },
          },
        });

        await prisma.loyaltyHistory.create({
          data: {
            customerId: createTransactionDto.customerId,
            points: pointsEarned,
            reason: 'purchase',
            reference: tx.id,
          },
        });
      }

      return tx;
    });

    return transaction;
  }

  // Liste paginée
  async findAll(page: number = 1, limit: number = 50, cashierId?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (cashierId) {
      where.cashierId = cashierId;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        include: {
          cashier: true,
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Détail d'une transaction
  async findOne(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        cashier: true,
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction #${id} non trouvée`);
    }

    return transaction;
  }

  // Transactions non synchronisées (pour sync)
  async findPendingSync() {
    return this.prisma.transaction.findMany({
      where: { syncStatus: 'pending' },
      include: {
        items: true,
      },
      orderBy: { date: 'asc' },
    });
  }

  // Marquer comme synchronisé
  async markAsSynced(id: string) {
    return this.prisma.transaction.update({
      where: { id },
      data: {
        syncStatus: 'synced',
        syncedAt: new Date(),
      },
    });
  }

  // Statistiques du jour
  async getTodayStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [transactions, totalRevenue, totalItems] = await Promise.all([
      this.prisma.transaction.count({
        where: {
          date: { gte: today },
          status: 'completed',
        },
      }),
      this.prisma.transaction.aggregate({
        where: {
          date: { gte: today },
          status: 'completed',
        },
        _sum: { total: true },
      }),
      this.prisma.transactionItem.aggregate({
        where: {
          transaction: {
            date: { gte: today },
            status: 'completed',
          },
        },
        _sum: { quantity: true },
      }),
    ]);

    const avgBasket = transactions > 0 ? (totalRevenue._sum.total || 0) / transactions : 0;

    return {
      transactions,
      revenue: totalRevenue._sum.total || 0,
      itemsSold: totalItems._sum.quantity || 0,
      avgBasket: Math.round(avgBasket),
    };
  }

  // Stats d'hier (pour comparaison dashboard)
  async getYesterdayStats() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [transactions, totalRevenue, totalItems] = await Promise.all([
      this.prisma.transaction.count({
        where: {
          date: { gte: yesterday, lt: todayStart },
          status: 'completed',
        },
      }),
      this.prisma.transaction.aggregate({
        where: {
          date: { gte: yesterday, lt: todayStart },
          status: 'completed',
        },
        _sum: { total: true },
      }),
      this.prisma.transactionItem.aggregate({
        where: {
          transaction: {
            date: { gte: yesterday, lt: todayStart },
            status: 'completed',
          },
        },
        _sum: { quantity: true },
      }),
    ]);

    const avgBasket = transactions > 0 ? (totalRevenue._sum.total || 0) / transactions : 0;

    return {
      transactions,
      revenue: totalRevenue._sum.total || 0,
      itemsSold: totalItems._sum.quantity || 0,
      avgBasket: Math.round(avgBasket),
    };
  }

  // Ventes des 7 derniers jours (pour graphique de tendance)
  async getWeekTrend() {
    const days: Array<{ date: string; label: string; revenue: number; transactions: number }> = [];
    const dayLabels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

    for (let i = 6; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const [count, revenue] = await Promise.all([
        this.prisma.transaction.count({
          where: { date: { gte: start, lt: end }, status: 'completed' },
        }),
        this.prisma.transaction.aggregate({
          where: { date: { gte: start, lt: end }, status: 'completed' },
          _sum: { total: true },
        }),
      ]);

      days.push({
        date: start.toISOString().slice(0, 10),
        label: dayLabels[start.getDay()],
        revenue: revenue._sum.total || 0,
        transactions: count,
      });
    }

    return days;
  }

  // Ventes par caisse
  async getSalesByRegister() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const registers = await this.prisma.cashRegister.findMany({
      include: {
        transactions: {
          where: {
            date: { gte: today },
            status: 'completed',
          },
          select: {
            total: true,
            id: true,
          },
        },
      },
    });

    return registers.map((reg) => ({
      id: reg.id,
      name: reg.name,
      code: reg.code,
      status: reg.status,
      transactionsCount: reg.transactions.length,
      revenue: reg.transactions.reduce((sum, t) => sum + t.total, 0),
    }));
  }

  // Ventes par heure (pour graphique dashboard)
  async getSalesByHour() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        date: { gte: today },
        status: 'completed',
      },
      select: {
        date: true,
        total: true,
      },
    });

    // Grouper par heure
    const hourlyData: { hour: string; revenue: number; transactions: number }[] = [];
    const hourMap = new Map<number, { revenue: number; transactions: number }>();

    // Initialiser toutes les heures (8h - 22h)
    for (let h = 8; h <= 22; h++) {
      hourMap.set(h, { revenue: 0, transactions: 0 });
    }

    transactions.forEach((tx) => {
      const hour = tx.date.getHours();
      const data = hourMap.get(hour);
      if (data) {
        data.revenue += tx.total;
        data.transactions += 1;
      }
    });

    hourMap.forEach((data, hour) => {
      hourlyData.push({
        hour: `${String(hour).padStart(2, '0')}h`,
        revenue: data.revenue,
        transactions: data.transactions,
      });
    });

    return hourlyData;
  }

  // Marge par catégorie (pour graphique dashboard)
  async getMarginByCategory() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: {
        category: true,
        price: true,
        costPrice: true,
        stock: true,
      },
    });

    // Grouper par catégorie
    const categoryMap = new Map<string, { revenue: number; margin: number; cost: number }>();

    products.forEach((p) => {
      const cat = p.category || 'Autres';
      const data = categoryMap.get(cat) || { revenue: 0, margin: 0, cost: 0 };
      const potentialRevenue = p.price * p.stock;
      const potentialCost = (p.costPrice || 0) * p.stock;
      data.revenue += potentialRevenue;
      data.cost += potentialCost;
      data.margin += potentialRevenue - potentialCost;
      categoryMap.set(cat, data);
    });

    const result = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        revenue: data.revenue,
        margin: data.margin,
        marginRate: data.revenue > 0 ? Math.round((data.margin / data.revenue) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 7);

    return result;
  }

  // Annuler/rembourser une transaction
  async refund(id: string, reason: string) {
    const transaction = await this.findOne(id);

    if (transaction.status === 'refunded') {
      throw new Error('Transaction déjà remboursée');
    }

    // Rembourser dans une transaction DB
    return this.prisma.$transaction(async (prisma) => {
      // 1. Marquer comme remboursée
      const updated = await prisma.transaction.update({
        where: { id },
        data: {
          status: 'refunded',
          syncStatus: 'pending', // Re-sync
        },
      });

      // 2. Remettre en stock
      for (const item of transaction.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });

        await prisma.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'in',
            quantity: item.quantity,
            reason: 'refund',
            reference: id,
            syncStatus: 'pending',
          },
        });
      }

      return updated;
    });
  }

  // Objectif mensuel (CA du mois vs objectif)
  async getMonthlyGoal() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const result = await this.prisma.transaction.aggregate({
      where: {
        date: { gte: startOfMonth, lte: endOfMonth },
        status: 'completed',
      },
      _sum: { total: true },
      _count: true,
    });

    const current = result._sum.total || 0;
    const goal = 500000; // Objectif fixe pour l'instant (TODO: rendre configurable)
    const progress = goal > 0 ? Math.round((current / goal) * 100) : 0;

    return {
      current,
      goal,
      progress,
      transactions: result._count,
      remaining: Math.max(0, goal - current),
    };
  }

  // Top produits vendus (ce mois)
  async getTopProducts(limit: number = 5) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const items = await this.prisma.transactionItem.groupBy({
      by: ['productId'],
      where: {
        transaction: {
          date: { gte: startOfMonth },
          status: 'completed',
        },
      },
      _sum: {
        quantity: true,
        total: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limit,
    });

    const products = await this.prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
      select: { id: true, name: true, sku: true, price: true },
    });

    return items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        productId: item.productId,
        productName: product?.name || 'Produit inconnu',
        sku: product?.sku || '',
        quantity: item._sum.quantity || 0,
        revenue: item._sum.total || 0,
      };
    });
  }

  // Panier moyen (aujourd'hui)
  async getAverageBasket() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.prisma.transaction.aggregate({
      where: {
        date: { gte: today },
        status: 'completed',
      },
      _sum: { total: true },
      _count: true,
    });

    const total = result._sum.total || 0;
    const count = result._count || 0;
    const average = count > 0 ? Math.round(total / count) : 0;

    return {
      average,
      total,
      transactions: count,
    };
  }
}
