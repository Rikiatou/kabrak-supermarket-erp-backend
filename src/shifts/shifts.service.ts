import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async openShift(dto: OpenShiftDto) {
    return this.prisma.shift.create({
      data: {
        registerId: dto.registerId,
        registerName: dto.registerName || null,
        employeeId: dto.employeeId,
        employeeName: dto.employeeName || null,
        openingCash: dto.openingCash,
        status: 'open',
      },
    });
  }

  async closeShift(id: string, dto: CloseShiftDto) {
    const difference = dto.closingCash - dto.expectedCash;

    return this.prisma.shift.update({
      where: { id },
      data: {
        closedAt: new Date(),
        closingCash: dto.closingCash,
        expectedCash: dto.expectedCash,
        difference,
        status: 'closed',
        notes: dto.notes,
      },
    });
  }

  async findActive() {
    return this.prisma.shift.findMany({
      where: { status: 'open' },
      orderBy: { openedAt: 'desc' },
    });
  }

  async findByEmployee(employeeId: string) {
    return this.prisma.shift.findMany({
      where: { employeeId },
      orderBy: { openedAt: 'desc' },
    });
  }

  async findAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [shifts, total] = await Promise.all([
      this.prisma.shift.findMany({
        orderBy: { openedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.shift.count(),
    ]);

    return {
      data: shifts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Z-Report: rapport de clôture de caisse
  async getZReport(shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // Si employeeName est null, récupérer le nom depuis l'employé
    let employeeName = shift.employeeName || '';
    if (!employeeName) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: shift.employeeId },
        select: { firstName: true, lastName: true },
      });
      if (employee) {
        employeeName = `${employee.firstName} ${employee.lastName}`;
      }
    }

    const startTime = shift.openedAt;
    const endTime = shift.closedAt || new Date();

    // Toutes les transactions de cette caisse pendant le shift
    // D'abord par registerId, sinon par cashierId (fallback pour anciennes transactions)
    let transactions = await this.prisma.transaction.findMany({
      where: {
        registerId: shift.registerId,
        date: { gte: startTime, lte: endTime },
        status: 'completed',
      },
      select: {
        id: true,
        transactionNumber: true,
        date: true,
        subtotal: true,
        discount: true,
        tax: true,
        total: true,
        paymentMethod: true,
        cashGiven: true,
        change: true,
        cashierId: true,
      },
      orderBy: { date: 'asc' },
    });

    // Fallback: si aucune transaction trouvée par registerId,
    // chercher par cashierId (l'employé du shift) dans la période
    if (transactions.length === 0) {
      transactions = await this.prisma.transaction.findMany({
        where: {
          cashierId: shift.employeeId,
          date: { gte: startTime, lte: endTime },
          status: 'completed',
        },
        select: {
          id: true,
          transactionNumber: true,
          date: true,
          subtotal: true,
          discount: true,
          tax: true,
          total: true,
          paymentMethod: true,
          cashGiven: true,
          change: true,
          cashierId: true,
        },
        orderBy: { date: 'asc' },
      });
    }

    // Agrégations
    const grossSales = transactions.reduce((s, t) => s + t.subtotal, 0);
    const totalDiscount = transactions.reduce((s, t) => s + t.discount, 0);
    const totalTax = transactions.reduce((s, t) => s + t.tax, 0);
    const netSales = transactions.reduce((s, t) => s + t.total, 0);
    const customerCount = transactions.length;
    const averageSale = customerCount > 0 ? Math.round(netSales / customerCount) : 0;

    // Receipts by method of payment
    const cashReceipts = transactions
      .filter((t) => t.paymentMethod === 'cash')
      .reduce((s, t) => s + (t.cashGiven || t.total), 0);
    const cardReceipts = transactions
      .filter((t) => t.paymentMethod === 'card')
      .reduce((s, t) => s + t.total, 0);
    const mobileReceipts = transactions
      .filter((t) => t.paymentMethod === 'mobile')
      .reduce((s, t) => s + t.total, 0);
    const splitTransactions = transactions.filter(
      (t) => t.paymentMethod === 'split' || t.paymentMethod === 'mixed',
    );
    const splitReceipts = splitTransactions.reduce((s, t) => s + t.total, 0);

    // Change given (monnaie rendue)
    const changeGiven = transactions.reduce((s, t) => s + (t.change || 0), 0);

    // Total receipts
    const totalReceipts = cashReceipts + cardReceipts + mobileReceipts + splitReceipts;

    // Cash drawer = opening cash + cash receipts - change given
    const cashDrawerTotal = shift.openingCash + cashReceipts - changeGiven;

    // Returns & credits
    const returns = await this.prisma.transaction.aggregate({
      where: {
        registerId: shift.registerId,
        date: { gte: startTime, lte: endTime },
        status: 'refunded',
      },
      _sum: { total: true },
    });

    return {
      shiftId: shift.id,
      registerId: shift.registerId,
      registerName: shift.registerName || shift.registerId,
      employeeId: shift.employeeId,
      employeeName,
      openedAt: shift.openedAt,
      closedAt: shift.closedAt,
      openingCash: shift.openingCash,
      closingCash: shift.closingCash,
      expectedCash: shift.expectedCash,
      difference: shift.difference,
      notes: shift.notes,

      grossSales,
      returnsAndCredits: returns._sum.total || 0,
      totalDiscount,
      totalTax,
      netSales,
      nonTaxableSales: netSales - totalTax,

      receiptsByMethod: {
        cash: cashReceipts,
        card: cardReceipts,
        mobile: mobileReceipts,
        split: splitReceipts,
      },
      totalReceipts,
      changeGiven,
      cashDrawerTotal,

      customerCount,
      averageSale,

      transactions: transactions.map((t) => ({
        id: t.id,
        transactionNumber: t.transactionNumber,
        date: t.date,
        total: t.total,
        paymentMethod: t.paymentMethod,
      })),
    };
  }
}
