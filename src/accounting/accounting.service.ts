import { Injectable } from '@nestjs/common';
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
  async getProfitAndLoss(startDate: Date, endDate: Date) {
    // Revenu des ventes (transactions)
    const salesAgg = await this.prisma.transaction.aggregate({
      where: {
        date: { gte: startDate, lte: endDate },
        status: 'completed',
      },
      _sum: { total: true },
    });

    // Revenus supplémentaires
    const revenuesAgg = await this.prisma.revenue.aggregate({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    // Dépenses
    const expensesAgg = await this.prisma.expense.aggregate({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    // Répartition des dépenses par catégorie
    const expenseBreakdown = await this.getExpenseBreakdown(startDate, endDate);

    // Répartition des revenus par catégorie
    const revenues = await this.prisma.revenue.groupBy({
      by: ['category'],
      where: {
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    const revenueByCategory = revenues.map((r) => ({
      category: r.category,
      amount: r._sum.amount || 0,
    }));

    const salesRevenue = salesAgg._sum.total || 0;
    const otherRevenue = revenuesAgg._sum.amount || 0;
    const totalRevenue = salesRevenue + otherRevenue;
    const totalExpenses = expensesAgg._sum.amount || 0;
    const netProfit = totalRevenue - totalExpenses;

    return {
      salesRevenue,
      otherRevenue,
      totalRevenue,
      totalExpenses,
      netProfit,
      revenueByCategory,
      expenseByCategory: expenseBreakdown,
    };
  }

  // Résumé mensuel (12 mois)
  async getMonthlySummary(year: number) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    const [transactions, revenues, expenses] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          status: 'completed',
        },
        select: { date: true, total: true },
      }),
      this.prisma.revenue.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
        },
        select: { date: true, amount: true },
      }),
      this.prisma.expense.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
        },
        select: { date: true, amount: true },
      }),
    ]);

    const monthMap = new Map<
      number,
      { month: number; revenue: number; expenses: number; profit: number }
    >();

    // Initialiser les 12 mois
    for (let m = 1; m <= 12; m++) {
      monthMap.set(m, { month: m, revenue: 0, expenses: 0, profit: 0 });
    }

    transactions.forEach((tx) => {
      const month = tx.date.getMonth() + 1;
      monthMap.get(month)!.revenue += tx.total;
    });

    revenues.forEach((rev) => {
      const month = rev.date.getMonth() + 1;
      monthMap.get(month)!.revenue += rev.amount;
    });

    expenses.forEach((exp) => {
      const month = exp.date.getMonth() + 1;
      monthMap.get(month)!.expenses += exp.amount;
    });

    return Array.from(monthMap.values())
      .map((m) => ({
        ...m,
        profit: m.revenue - m.expenses,
      }))
      .sort((a, b) => a.month - b.month);
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
