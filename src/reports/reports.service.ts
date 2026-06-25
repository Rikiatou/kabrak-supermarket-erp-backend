import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // Rapport des ventes global
  async getSalesReport(startDate: Date, endDate: Date) {
    const [agg, count] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          date: { gte: startDate, lte: endDate },
          status: 'completed',
        },
        _sum: { total: true, subtotal: true, discount: true, tax: true },
        _avg: { total: true },
      }),
      this.prisma.transaction.count({
        where: {
          date: { gte: startDate, lte: endDate },
          status: 'completed',
        },
      }),
    ]);

    const totalRevenue = agg._sum.total || 0;
    const avgBasket = count > 0 ? Math.round(totalRevenue / count) : 0;

    // Répartition par jour
    const byDay = await this.getSalesByDay(startDate, endDate);

    return {
      totalRevenue,
      totalSubtotal: agg._sum.subtotal || 0,
      totalDiscount: agg._sum.discount || 0,
      totalTax: agg._sum.tax || 0,
      transactionsCount: count,
      avgBasket,
      byDay,
    };
  }

  // Ventes par catégorie de produits
  async getSalesByCategory(startDate: Date, endDate: Date) {
    const items = await this.prisma.transactionItem.findMany({
      where: {
        transaction: {
          date: { gte: startDate, lte: endDate },
          status: 'completed',
        },
      },
      select: {
        quantity: true,
        total: true,
        product: { select: { category: true } },
      },
    });

    const categoryMap = new Map<
      string,
      { category: string; revenue: number; quantity: number }
    >();

    items.forEach((item) => {
      const category = item.product.category;
      const existing = categoryMap.get(category) || {
        category,
        revenue: 0,
        quantity: 0,
      };
      existing.revenue += item.total;
      existing.quantity += item.quantity;
      categoryMap.set(category, existing);
    });

    return Array.from(categoryMap.values()).sort((a, b) => b.revenue - a.revenue);
  }

  // Ventes par employé (caissier)
  async getSalesByEmployee(startDate: Date, endDate: Date) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        status: 'completed',
      },
      select: {
        total: true,
        cashier: {
          select: { id: true, firstName: true, lastName: true, employeeNumber: true },
        },
      },
    });

    const employeeMap = new Map<
      string,
      {
        employeeId: string;
        employeeName: string;
        employeeNumber: string;
        revenue: number;
        transactions: number;
      }
    >();

    transactions.forEach((tx) => {
      const id = tx.cashier.id;
      const existing = employeeMap.get(id) || {
        employeeId: id,
        employeeName: `${tx.cashier.firstName} ${tx.cashier.lastName}`,
        employeeNumber: tx.cashier.employeeNumber,
        revenue: 0,
        transactions: 0,
      };
      existing.revenue += tx.total;
      existing.transactions += 1;
      employeeMap.set(id, existing);
    });

    return Array.from(employeeMap.values()).sort((a, b) => b.revenue - a.revenue);
  }

  // Meilleures ventes (top produits)
  async getTopProducts(startDate: Date, endDate: Date, limit: number = 20) {
    const items = await this.prisma.transactionItem.findMany({
      where: {
        transaction: {
          date: { gte: startDate, lte: endDate },
          status: 'completed',
        },
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true, category: true, price: true },
        },
      },
    });

    const productMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        sku: string;
        category: string;
        quantity: number;
        revenue: number;
      }
    >();

    items.forEach((item) => {
      const id = item.productId;
      const existing = productMap.get(id) || {
        productId: id,
        productName: item.product.name,
        sku: item.product.sku,
        category: item.product.category,
        quantity: 0,
        revenue: 0,
      };
      existing.quantity += item.quantity;
      existing.revenue += item.total;
      productMap.set(id, existing);
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);
  }

  // Pires ventes (worst produits)
  async getWorstProducts(startDate: Date, endDate: Date, limit: number = 20) {
    const items = await this.prisma.transactionItem.findMany({
      where: {
        transaction: {
          date: { gte: startDate, lte: endDate },
          status: 'completed',
        },
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true, category: true, price: true },
        },
      },
    });

    const productMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        sku: string;
        category: string;
        quantity: number;
        revenue: number;
      }
    >();

    items.forEach((item) => {
      const id = item.productId;
      const existing = productMap.get(id) || {
        productId: id,
        productName: item.product.name,
        sku: item.product.sku,
        category: item.product.category,
        quantity: 0,
        revenue: 0,
      };
      existing.quantity += item.quantity;
      existing.revenue += item.total;
      productMap.set(id, existing);
    });

    return Array.from(productMap.values())
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, limit);
  }

  // Analyse de profit (revenu vs coût)
  async getProfitAnalysis(startDate: Date, endDate: Date) {
    const items = await this.prisma.transactionItem.findMany({
      where: {
        transaction: {
          date: { gte: startDate, lte: endDate },
          status: 'completed',
        },
      },
      select: {
        quantity: true,
        total: true,
        product: { select: { costPrice: true } },
      },
    });

    let totalRevenue = 0;
    let totalCost = 0;

    items.forEach((item) => {
      totalRevenue += item.total;
      totalCost += item.product.costPrice * item.quantity;
    });

    const grossProfit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      grossProfit,
      margin: Math.round(margin * 100) / 100,
    };
  }

  // Rapport des réductions (transactions avec discount > 0)
  async getDiscountsReport(startDate: Date, endDate: Date) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        status: 'completed',
        discount: { gt: 0 },
      },
      include: {
        cashier: {
          select: { firstName: true, lastName: true },
        },
        items: {
          include: {
            product: { select: { name: true, sku: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Agrégation par produit
    const productDiscountMap = new Map<
      string,
      { productName: string; sku: string; totalDiscount: number; occurrences: number }
    >();

    transactions.forEach((tx) => {
      tx.items.forEach((item) => {
        if (item.discount > 0) {
          const name = item.product?.name || 'Inconnu';
          const sku = item.product?.sku || '';
          const key = item.productId;
          const existing = productDiscountMap.get(key) || {
            productName: name,
            sku,
            totalDiscount: 0,
            occurrences: 0,
          };
          existing.totalDiscount += item.discount;
          existing.occurrences += 1;
          productDiscountMap.set(key, existing);
        }
      });
    });

    const totalDiscount = transactions.reduce((sum, tx) => sum + tx.discount, 0);

    return {
      totalDiscount,
      transactionsCount: transactions.length,
      transactions: transactions.map((tx) => ({
        id: tx.id,
        transactionNumber: tx.transactionNumber,
        date: tx.date,
        cashierName: `${tx.cashier.firstName} ${tx.cashier.lastName}`,
        subtotal: tx.subtotal,
        discount: tx.discount,
        total: tx.total,
        items: tx.items
          .filter((i) => i.discount > 0)
          .map((i) => ({
            productName: i.product?.name || 'Inconnu',
            sku: i.product?.sku || '',
            quantity: i.quantity,
            discount: i.discount,
          })),
      })),
      byProduct: Array.from(productDiscountMap.values()).sort(
        (a, b) => b.totalDiscount - a.totalDiscount,
      ),
    };
  }

  // Ventes par jour
  async getSalesByDay(startDate: Date, endDate: Date) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        status: 'completed',
      },
      select: {
        date: true,
        total: true,
      },
    });

    const dayMap = new Map<
      string,
      { date: string; revenue: number; transactions: number }
    >();

    transactions.forEach((tx) => {
      const dateKey = tx.date.toISOString().slice(0, 10);
      const existing = dayMap.get(dateKey) || {
        date: dateKey,
        revenue: 0,
        transactions: 0,
      };
      existing.revenue += tx.total;
      existing.transactions += 1;
      dayMap.set(dateKey, existing);
    });

    return Array.from(dayMap.values())
      .map((d) => ({
        ...d,
        avgBasket: d.transactions > 0 ? Math.round(d.revenue / d.transactions) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Ventes par mois
  async getSalesByMonth(year: number) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        status: 'completed',
      },
      select: {
        date: true,
        total: true,
      },
    });

    const monthMap = new Map<
      number,
      { month: number; revenue: number; transactions: number }
    >();

    // Initialiser les 12 mois
    for (let m = 1; m <= 12; m++) {
      monthMap.set(m, { month: m, revenue: 0, transactions: 0 });
    }

    transactions.forEach((tx) => {
      const month = tx.date.getMonth() + 1;
      const existing = monthMap.get(month)!;
      existing.revenue += tx.total;
      existing.transactions += 1;
    });

    return Array.from(monthMap.values())
      .map((m) => ({
        ...m,
        avgBasket: m.transactions > 0 ? Math.round(m.revenue / m.transactions) : 0,
      }))
      .sort((a, b) => a.month - b.month);
  }

  // Valorisation de l'inventaire
  async getInventoryValuation() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: {
        stock: true,
        costPrice: true,
        price: true,
      },
    });

    let totalStockAtCost = 0;
    let totalStockAtSale = 0;
    let totalUnits = 0;

    products.forEach((p) => {
      totalStockAtCost += p.costPrice * p.stock;
      totalStockAtSale += p.price * p.stock;
      totalUnits += p.stock;
    });

    const potentialMargin = totalStockAtSale - totalStockAtCost;
    const marginPercentage =
      totalStockAtSale > 0 ? (potentialMargin / totalStockAtSale) * 100 : 0;

    return {
      totalUnits,
      totalStockAtCost,
      totalStockAtSale,
      potentialMargin,
      marginPercentage: Math.round(marginPercentage * 100) / 100,
    };
  }
}
