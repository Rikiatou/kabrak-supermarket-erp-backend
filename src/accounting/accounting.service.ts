import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getCurrentTenantId } from '../tenant/tenant.context';
import { PrismaService } from '../database/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateRevenueDto } from './dto/create-revenue.dto';

@Injectable()
export class AccountingService {
  constructor(private prisma: PrismaService) {}

  // Lister les dépenses
  async getExpenses(startDate: Date, endDate: Date, category?: string) {
    const where: any = {
      date: { gte: startDate, lte: endDate },
    };

    if (category) {
      where.category = category;
    }

    return this.prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  // Créer une dépense
  async createExpense(dto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: {
        date: dto.date ? new Date(dto.date) : new Date(),
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod || 'cash',
        supplier: dto.supplier,
        status: 'paid',
        createdBy: dto.createdBy || null,
      },
    });
  }

  // Lister les revenus
  async getRevenues(startDate: Date, endDate: Date, category?: string) {
    const where: any = {
      date: { gte: startDate, lte: endDate },
    };

    if (category) {
      where.category = category;
    }

    return this.prisma.revenue.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  // Créer un revenu
  async createRevenue(dto: CreateRevenueDto) {
    return this.prisma.revenue.create({
      data: {
        date: dto.date ? new Date(dto.date) : new Date(),
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
      },
    });
  }

  // Compte de résultat (Profit & Loss)
  private tenantSql(alias: string) {
    const tenantId = getCurrentTenantId();
    return tenantId
      ? Prisma.sql`AND ${Prisma.raw(`${alias}."tenantId"`)} = ${tenantId}`
      : Prisma.empty;
  }

  private async sumSql(query: Prisma.Sql): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ v: bigint | number | null }>>(query);
    return Number(rows[0]?.v ?? 0);
  }

  // Coût d'achat (prix d'achat actuel du produit) des articles vendus sur la période
  private costOfGoodsSold(start: Date, end: Date) {
    return this.sumSql(Prisma.sql`
      SELECT COALESCE(SUM(ti.quantity * p."costPrice"), 0) AS v
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti."transactionId"
      JOIN products p ON p.id = ti."productId"
      WHERE t.status = 'completed' AND t.date >= ${start} AND t.date <= ${end}
      ${this.tenantSql('t')}`);
  }

  // Pertes déclarées (page Pertes : ajustements "damage: ...", "expiry: ..." etc.)
  private lossesValue(start: Date, end: Date) {
    return this.sumSql(Prisma.sql`
      SELECT COALESCE(SUM(-m.quantity * p."costPrice"), 0) AS v
      FROM stock_movements m
      JOIN products p ON p.id = m."productId"
      WHERE m.quantity < 0 AND m."createdAt" >= ${start} AND m."createdAt" <= ${end}
        AND (m.type = 'loss' OR m.reason ~ '^(damage|expiry|theft|loss|other):')
      ${this.tenantSql('m')}`);
  }

  // Retours remboursés en argent (comme le Z) et coût des articles revenus en stock
  private async refunds(start: Date, end: Date) {
    const where = Prisma.sql`r.status = 'completed' AND r."returnDate" >= ${start} AND r."returnDate" <= ${end}
      AND r."refundMethod" IN ('cash', 'card', 'mobile', 'orange') ${this.tenantSql('r')}`;
    const [amount, cost] = await Promise.all([
      this.sumSql(Prisma.sql`SELECT COALESCE(SUM(r."totalRefunded"), 0) AS v FROM returns r WHERE ${where}`),
      this.sumSql(Prisma.sql`
        SELECT COALESCE(SUM(ri.quantity * p."costPrice"), 0) AS v
        FROM return_items ri
        JOIN returns r ON r.id = ri."returnId"
        JOIN products p ON p.id = ri."productId"
        WHERE ${where}`),
    ]);
    return { amount, cost };
  }

  private async salesByPaymentMethod(start: Date, end: Date) {
    const where = { date: { gte: start, lte: end }, status: 'completed' };
    const [groups, splits] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['paymentMethod'],
        where,
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.transaction.findMany({
        where: { ...where, paymentMethod: 'split' },
        select: { splitBreakdown: true },
      }),
    ]);
    const totals: Record<string, { amount: number; count: number }> = {};
    const add = (method: string, amount: number, count: number) => {
      const key = method === 'orange' ? 'mobile' : method || 'other';
      totals[key] = totals[key] || { amount: 0, count: 0 };
      totals[key].amount += amount;
      totals[key].count += count;
    };
    for (const g of groups) {
      if (g.paymentMethod === 'split') continue;
      add(g.paymentMethod, g._sum.total || 0, g._count);
    }
    for (const s of splits) {
      try {
        const parts = JSON.parse(s.splitBreakdown || '{}') as Record<string, number>;
        for (const [method, amount] of Object.entries(parts)) {
          if (Number(amount) > 0) add(method, Number(amount), 0);
        }
      } catch {
        add('other', 0, 0);
      }
    }
    return Object.entries(totals)
      .map(([method, v]) => ({ method, ...v }))
      .sort((a, b) => b.amount - a.amount);
  }

  private async purchasesReceived(start: Date, end: Date) {
    const agg = await this.prisma.purchaseOrder.aggregate({
      where: { status: 'received', receivedDate: { gte: start, lte: end } },
      _sum: { total: true },
      _count: true,
    });
    return { amount: agg._sum.total || 0, count: agg._count };
  }

  async getProfitAndLoss(startDate: Date, endDate: Date) {
    const [salesAgg, revenuesAgg, expensesAgg, cogs, losses, refunds, paymentMethods, purchases, expenseBreakdown, revenues] =
      await Promise.all([
        this.prisma.transaction.aggregate({
          where: { date: { gte: startDate, lte: endDate }, status: 'completed' },
          _sum: { total: true },
          _count: true,
        }),
        this.prisma.revenue.aggregate({
          where: { date: { gte: startDate, lte: endDate } },
          _sum: { amount: true },
        }),
        this.prisma.expense.aggregate({
          where: { date: { gte: startDate, lte: endDate } },
          _sum: { amount: true },
        }),
        this.costOfGoodsSold(startDate, endDate),
        this.lossesValue(startDate, endDate),
        this.refunds(startDate, endDate),
        this.salesByPaymentMethod(startDate, endDate),
        this.purchasesReceived(startDate, endDate),
        this.getExpenseBreakdown(startDate, endDate),
        this.prisma.revenue.groupBy({
          by: ['category'],
          where: { date: { gte: startDate, lte: endDate } },
          _sum: { amount: true },
        }),
      ]);

    const grossSales = salesAgg._sum.total || 0;
    const salesRevenue = grossSales - refunds.amount;
    const costOfGoodsSold = Math.max(0, cogs - refunds.cost);
    const grossProfit = salesRevenue - costOfGoodsSold;
    const otherRevenue = revenuesAgg._sum.amount || 0;
    const totalRevenue = salesRevenue + otherRevenue;
    const totalExpenses = expensesAgg._sum.amount || 0;
    const netProfit = grossProfit + otherRevenue - totalExpenses - losses;

    return {
      grossSales,
      refunds: refunds.amount,
      salesRevenue,
      salesCount: salesAgg._count,
      costOfGoodsSold,
      grossProfit,
      grossMarginRate: salesRevenue > 0 ? Math.round((grossProfit / salesRevenue) * 1000) / 10 : 0,
      otherRevenue,
      totalRevenue,
      totalExpenses,
      losses,
      netProfit,
      netMarginRate: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 1000) / 10 : 0,
      paymentMethods,
      purchases,
      revenueByCategory: revenues.map((r) => ({ category: r.category, amount: r._sum.amount || 0 })),
      expenseByCategory: expenseBreakdown,
    };
  }

  // Résumé mensuel (12 mois) — même calcul que getProfitAndLoss
  async getMonthlySummary(year: number) {
    const result: Array<{
      month: number;
      revenue: number;
      costOfGoodsSold: number;
      grossProfit: number;
      expenses: number;
      losses: number;
      profit: number;
    }> = [];
    const now = new Date();
    for (let m = 1; m <= 12; m++) {
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 0, 23, 59, 59, 999);
      if (start > now) {
        result.push({ month: m, revenue: 0, costOfGoodsSold: 0, grossProfit: 0, expenses: 0, losses: 0, profit: 0 });
        continue;
      }
      const pl = await this.getProfitAndLoss(start, end);
      result.push({
        month: m,
        revenue: pl.totalRevenue,
        costOfGoodsSold: pl.costOfGoodsSold,
        grossProfit: pl.grossProfit,
        expenses: pl.totalExpenses,
        losses: pl.losses,
        profit: pl.netProfit,
      });
    }
    return result;
  }

  // Répartition des dépenses par catégorie
  async getExpenseBreakdown(startDate: Date, endDate: Date) {
    const expenses = await this.prisma.expense.groupBy({
      by: ['category'],
      where: {
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    return expenses.map((e) => ({
      category: e.category,
      amount: e._sum.amount || 0,
    }));
  }
}
