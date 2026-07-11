import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
    const existing = await this.prisma.shift.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Shift #${id} introuvable`);
    }
    if (existing.status === 'closed') {
      throw new BadRequestException('Ce shift est déjà clôturé');
    }
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

  async findAll(page: number = 1, limit: number = 100) {
    const skip = (page - 1) * limit;
    const shifts = await this.prisma.shift.findMany({
      orderBy: { openedAt: 'desc' },
      skip,
      take: limit,
    });

    // Retourner un array direct (le frontend fait .filter() dessus)
    return shifts;
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
    let transactions: any[] = await this.prisma.transaction.findMany({
      where: {
        registerId: shift.registerId,
        date: { gte: startTime, lte: endTime },
        status: 'completed',
      },
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            unitPrice: true,
            total: true,
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Fallback: si aucune transaction trouvée par registerId (par exemple si
    // registerId était null dans les anciennes transactions), chercher par
    // cashierId (l'employé du shift) dans la période — uniquement si le
    // registerId du shift est null pour éviter de mélanger les caisses
    if (transactions.length === 0 && !shift.registerId) {
      transactions = await this.prisma.transaction.findMany({
        where: {
          cashierId: shift.employeeId,
          date: { gte: startTime, lte: endTime },
          status: 'completed',
        },
        include: {
          items: {
            select: {
              id: true,
              productId: true,
              quantity: true,
              unitPrice: true,
              total: true,
            },
          },
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

    // Receipts by method of payment (montant des ventes, pas cashGiven)
    // Pour les splits, décomposer le breakdown en cash/card/mobile/orange
    let cashReceipts = 0, cardReceipts = 0, mobileReceipts = 0, orangeReceipts = 0, splitReceipts = 0;
    let splitCash = 0, splitCard = 0, splitMobile = 0, splitOrange = 0;
    for (const t of transactions) {
      if (t.paymentMethod === 'cash') {
        cashReceipts += t.total;
      } else if (t.paymentMethod === 'card') {
        cardReceipts += t.total;
      } else if (t.paymentMethod === 'mobile') {
        mobileReceipts += t.total;
      } else if (t.paymentMethod === 'orange') {
        orangeReceipts += t.total;
      } else if (t.paymentMethod === 'split' || t.paymentMethod === 'mixed') {
        splitReceipts += t.total;
        // Décomposer le split si breakdown disponible
        if (t.splitBreakdown) {
          try {
            const bd = JSON.parse(t.splitBreakdown);
            if (bd.cash) { splitCash += bd.cash; cashReceipts += bd.cash; }
            if (bd.card) { splitCard += bd.card; cardReceipts += bd.card; }
            if (bd.mobile) { splitMobile += bd.mobile; mobileReceipts += bd.mobile; }
            if (bd.orange) { splitOrange += bd.orange; orangeReceipts += bd.orange; }
          } catch {}
        }
      }
    }

    // Cash physically received (cashGiven) and change given (monnaie rendue)
    const cashReceived = transactions
      .filter((t) => t.paymentMethod === 'cash')
      .reduce((s, t) => s + (t.cashGiven || t.total), 0)
      + splitCash; // inclure le cash des splits
    const changeGiven = transactions.reduce((s, t) => s + (t.change || 0), 0);

    // Total receipts = somme des ventes par méthode (split déjà décomposé)
    const totalReceipts = cashReceipts + cardReceipts + mobileReceipts + orangeReceipts;

    // Cash drawer = opening cash + cash physically received - change given
    const cashDrawerTotal = shift.openingCash + cashReceived - changeGiven;

    // Total expected = opening cash + all sales (non-cash) - change given
    const totalExpected = shift.openingCash + cardReceipts + mobileReceipts + orangeReceipts + cashReceived - changeGiven;

    // Returns & credits — from refunded transactions
    const refundedTx = await this.prisma.transaction.aggregate({
      where: {
        registerId: shift.registerId,
        date: { gte: startTime, lte: endTime },
        status: 'refunded',
      },
      _sum: { total: true },
    });

    // Returns from ProductReturn table (processed via Returns page)
    const productReturns = await this.prisma.productReturn.aggregate({
      where: {
        createdBy: shift.employeeId,
        returnDate: { gte: startTime, lte: endTime },
        status: 'completed',
      },
      _sum: { totalRefunded: true },
    });

    const returnsAndCredits = (refundedTx._sum.total || 0) + (productReturns._sum.totalRefunded || 0);

    // Invoice payments collected by this cashier during the shift
    const invoicePayments = await this.prisma.invoicePayment.findMany({
      where: {
        cashierId: shift.employeeId,
        date: { gte: startTime, lte: endTime },
      },
      select: { amount: true, method: true },
    });

    const invoiceCash = invoicePayments.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0);
    const invoiceCard = invoicePayments.filter(p => p.method === 'card').reduce((s, p) => s + p.amount, 0);
    const invoiceMobile = invoicePayments.filter(p => p.method === 'mobile' || p.method === 'orange').reduce((s, p) => s + p.amount, 0);
    const invoiceTotal = invoicePayments.reduce((s, p) => s + p.amount, 0);

    // Net sales = POS sales (incluant les transactions INV-PAY-) - returns
    // Les paiements de factures sont déjà dans les transactions (préfixe INV-PAY-)
    // donc ils sont déjà comptés dans cashReceipts et netSales
    const adjustedNetSales = netSales - returnsAndCredits;

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

      grossSales: grossSales,
      returnsAndCredits,
      totalDiscount,
      totalTax,
      netSales: adjustedNetSales,
      nonTaxableSales: adjustedNetSales - totalTax,

      // Invoice payments collected during this shift (informational)
      invoicePayments: {
        cash: invoiceCash,
        card: invoiceCard,
        mobile: invoiceMobile,
        total: invoiceTotal,
      },

      // Receipts = tout le cash reçu (POS + factures) dans cash
      // Pas de ligne facture séparée pour éviter la confusion
      receiptsByMethod: {
        cash: cashReceipts,           // POS cash + invoice cash (via transactions INV-PAY-)
        card: cardReceipts,           // POS card + invoice card
        mobile: mobileReceipts,       // POS mobile + invoice mobile
        orange: orangeReceipts,
        split: splitReceipts,
      },
      totalReceipts: totalReceipts,   // Pas + invoiceTotal (déjà dans cashReceipts)
      changeGiven,
      cashReceived,
      cashDrawerTotal: cashDrawerTotal,
      totalExpected: totalExpected + invoiceCash,

      customerCount,
      averageSale,

      // Détail des transactions avec les produits vendus
      transactions: transactions.map((t) => ({
        id: t.id,
        transactionNumber: t.transactionNumber,
        date: t.date,
        subtotal: t.subtotal,
        discount: t.discount,
        total: t.total,
        paymentMethod: t.paymentMethod,
        items: t.items || [],
      })),

      // Détail des produits vendus (agrégé)
      soldProducts: this.aggregateSoldProducts(transactions),
    };
  }

  // Agréger les produits vendus depuis les transactions
  private aggregateSoldProducts(transactions: any[]) {
    const productMap = new Map<string, { productId: string; productName: string; quantity: number; total: number }>();

    for (const tx of transactions) {
      if (!tx.items) continue;
      for (const item of tx.items) {
        const key = item.productId;
        const name = item.product?.name || 'Produit supprimé';
        const existing = productMap.get(key);
        if (existing) {
          existing.quantity += item.quantity;
          existing.total += item.total;
        } else {
          productMap.set(key, {
            productId: key,
            productName: name,
            quantity: item.quantity,
            total: item.total,
          });
        }
      }
    }

    return Array.from(productMap.values()).sort((a, b) => b.total - a.total);
  }

  // Z-Report journalier par caissier (sans dépendre des shifts)
  // Agrège toutes les transactions d'un employé pour une date donnée
  async getDailyZReport(employeeId: string, dateStr: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, firstName: true, lastName: true, employeeNumber: true },
    });

    if (!employee) {
      throw new NotFoundException('Employé introuvable');
    }

    const employeeName = `${employee.firstName} ${employee.lastName}`;

    // Construire la plage de la journée (00:00 → 23:59:59)
    const dayStart = new Date(`${dateStr}T00:00:00.000`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999`);

    // Toutes les transactions complétées de ce caissier ce jour
    const transactions: any[] = await this.prisma.transaction.findMany({
      where: {
        cashierId: employeeId,
        date: { gte: dayStart, lte: dayEnd },
        status: 'completed',
      },
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            unitPrice: true,
            total: true,
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Agrégations
    const grossSales = transactions.reduce((s, t) => s + t.subtotal, 0);
    const totalDiscount = transactions.reduce((s, t) => s + t.discount, 0);
    const totalTax = transactions.reduce((s, t) => s + t.tax, 0);
    const netSales = transactions.reduce((s, t) => s + t.total, 0);
    const customerCount = transactions.length;
    const averageSale = customerCount > 0 ? Math.round(netSales / customerCount) : 0;

    // Receipts by method — décomposer les splits
    let cashReceipts = 0, cardReceipts = 0, mobileReceipts = 0, orangeReceipts = 0, splitReceipts = 0;
    let splitCash = 0;
    for (const t of transactions) {
      if (t.paymentMethod === 'cash') {
        cashReceipts += t.total;
      } else if (t.paymentMethod === 'card') {
        cardReceipts += t.total;
      } else if (t.paymentMethod === 'mobile') {
        mobileReceipts += t.total;
      } else if (t.paymentMethod === 'orange') {
        orangeReceipts += t.total;
      } else if (t.paymentMethod === 'split' || t.paymentMethod === 'mixed') {
        splitReceipts += t.total;
        if (t.splitBreakdown) {
          try {
            const bd = JSON.parse(t.splitBreakdown);
            if (bd.cash) { splitCash += bd.cash; cashReceipts += bd.cash; }
            if (bd.card) { cardReceipts += bd.card; }
            if (bd.mobile) { mobileReceipts += bd.mobile; }
            if (bd.orange) { orangeReceipts += bd.orange; }
          } catch {}
        }
      }
    }

    const cashReceived = transactions
      .filter((t) => t.paymentMethod === 'cash')
      .reduce((s, t) => s + (t.cashGiven || t.total), 0)
      + splitCash;
    const changeGiven = transactions.reduce((s, t) => s + (t.change || 0), 0);
    const totalReceipts = cashReceipts + cardReceipts + mobileReceipts + orangeReceipts;

    // Returns — from refunded transactions
    const refundedTx = await this.prisma.transaction.aggregate({
      where: {
        cashierId: employeeId,
        date: { gte: dayStart, lte: dayEnd },
        status: 'refunded',
      },
      _sum: { total: true },
    });

    // Returns from ProductReturn table (processed via Returns page)
    const productReturns = await this.prisma.productReturn.aggregate({
      where: {
        createdBy: employeeId,
        returnDate: { gte: dayStart, lte: dayEnd },
        status: 'completed',
      },
      _sum: { totalRefunded: true },
    });

    const returnsAndCredits = (refundedTx._sum.total || 0) + (productReturns._sum.totalRefunded || 0);

    // Invoice payments collected by this cashier during the day
    const invoicePayments = await this.prisma.invoicePayment.findMany({
      where: {
        cashierId: employeeId,
        date: { gte: dayStart, lte: dayEnd },
      },
      select: { amount: true, method: true },
    });

    const invoiceCash = invoicePayments.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0);
    const invoiceCard = invoicePayments.filter(p => p.method === 'card').reduce((s, p) => s + p.amount, 0);
    const invoiceMobile = invoicePayments.filter(p => p.method === 'mobile' || p.method === 'orange').reduce((s, p) => s + p.amount, 0);
    const invoiceTotal = invoicePayments.reduce((s, p) => s + p.amount, 0);

    // Net sales = POS sales (incluant INV-PAY-) - returns
    // Les paiements de factures sont déjà dans les transactions (préfixe INV-PAY-)
    const adjustedNetSales = netSales - returnsAndCredits;

    // Chercher les shifts de ce caissier ce jour (pour info)
    const shifts = await this.prisma.shift.findMany({
      where: {
        employeeId,
        OR: [
          { openedAt: { gte: dayStart, lte: dayEnd } },
          { closedAt: { gte: dayStart, lte: dayEnd } },
        ],
      },
      orderBy: { openedAt: 'asc' },
    });

    const openingCash = shifts.reduce((s, sh) => s + (sh.openingCash || 0), 0);
    const closingCash = shifts.reduce((s, sh) => s + (sh.closingCash || 0), 0);
    const cashDrawerTotal = openingCash + cashReceived - changeGiven;

    const registerId = shifts[0]?.registerId || transactions[0]?.registerId || 'N/A';
    const registerName = shifts[0]?.registerName || registerId;

    return {
      shiftId: `daily-${dateStr}-${employeeId}`,
      registerId,
      registerName,
      employeeId,
      employeeName,
      openedAt: dayStart,
      closedAt: dayEnd,
      openingCash,
      closingCash,
      expectedCash: cashDrawerTotal,
      difference: closingCash - cashDrawerTotal,
      notes: `Z-Report journalier — ${dateStr}`,

      grossSales: grossSales,
      returnsAndCredits,
      totalDiscount,
      totalTax,
      netSales: adjustedNetSales,
      nonTaxableSales: adjustedNetSales - totalTax,

      // Invoice payments collected during this day (informational)
      invoicePayments: {
        cash: invoiceCash,
        card: invoiceCard,
        mobile: invoiceMobile,
        total: invoiceTotal,
      },

      // Receipts = POS sales by method (incluant INV-PAY- dans cash)
      // invoice = ligne informative (sous-ensemble, pas à ajouter au total)
      receiptsByMethod: {
        cash: cashReceipts,           // POS cash + invoice cash (via INV-PAY-)
        card: cardReceipts,           // POS card + invoice card
        mobile: mobileReceipts,       // POS mobile + invoice mobile
        orange: orangeReceipts,
        split: splitReceipts,
        invoice: invoiceTotal,        // Informatif : montant des paiements de factures
      },
      totalReceipts: totalReceipts,   // Pas + invoiceTotal (déjà dans cashReceipts)
      changeGiven,
      cashReceived,
      cashDrawerTotal,
      totalExpected: totalReceipts + openingCash - changeGiven,

      customerCount,
      averageSale,

      // Détail des transactions avec les produits vendus
      transactions: transactions.map((t) => ({
        id: t.id,
        transactionNumber: t.transactionNumber,
        date: t.date,
        subtotal: t.subtotal,
        discount: t.discount,
        total: t.total,
        paymentMethod: t.paymentMethod,
        items: t.items || [],
      })),

      // Détail des produits vendus (agrégé)
      soldProducts: this.aggregateSoldProducts(transactions),
    };
  }
}
