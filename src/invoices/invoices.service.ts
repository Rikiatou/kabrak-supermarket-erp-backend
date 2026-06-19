import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 50, status?: string) {
    const where = status ? { status } : {};
    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          items: true,
          payments: { orderBy: { date: 'asc' } },
          customer: { select: { customerNumber: true, firstName: true, lastName: true } },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { invoices, total, page, limit };
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { name: true, sku: true } } } },
        payments: { orderBy: { date: 'asc' } },
        customer: true,
      },
    });
    if (!invoice) throw new NotFoundException(`Facture ${id} introuvable`);
    return invoice;
  }

  async create(dto: CreateInvoiceDto) {
    const year = new Date().getFullYear();
    const count = await this.prisma.invoice.count({
      where: { number: { startsWith: `FAC-${year}-` } },
    });
    const number = `FAC-${year}-${String(count + 1).padStart(4, '0')}`;

    const items = dto.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice,
      productId: item.productId || null,
    }));

    const subtotal = items.reduce((s, i) => s + i.total, 0);
    const taxRate = 15.5;
    const tax = Math.round(subtotal * (taxRate / 100));
    const total = subtotal + tax;

    return this.prisma.invoice.create({
      data: {
        number,
        clientName: dto.clientName,
        clientPhone: dto.clientPhone,
        clientEmail: dto.clientEmail || null,
        clientAddress: dto.clientAddress || null,
        customerId: dto.customerId || null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        subtotal,
        taxRate,
        tax,
        total,
        balance: total, // au départ, tout reste à payer
        notes: dto.notes || null,
        items: { create: items },
      },
      include: { items: true, payments: true },
    });
  }

  // Encaisser un versement sur une facture
  async addPayment(invoiceId: string, dto: CreatePaymentDto) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });
    if (!invoice) throw new NotFoundException(`Facture ${invoiceId} introuvable`);

    if (dto.amount <= 0) {
      throw new BadRequestException('Le montant du versement doit être positif');
    }

    const currentPaid = invoice.payments.reduce((s, p) => s + p.amount, 0);
    const remaining = invoice.total - currentPaid;

    if (dto.amount > remaining) {
      throw new BadRequestException(
        `Le versement (${dto.amount}) dépasse le reste à payer (${remaining} FCFA)`,
      );
    }

    // Créer le versement
    const payment = await this.prisma.invoicePayment.create({
      data: {
        invoiceId,
        amount: dto.amount,
        method: dto.method,
        note: dto.note || null,
      },
    });

    // Recalculer paidAmount et balance
    const newPaidAmount = currentPaid + dto.amount;
    const newBalance = invoice.total - newPaidAmount;

    // Déterminer le statut
    let newStatus = invoice.status;
    if (newBalance === 0) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'partial';
    }

    // Mettre à jour la facture
    const updated = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidAmount,
        balance: newBalance,
        status: newStatus,
        paidAt: newBalance === 0 ? new Date() : null,
        paymentMethod: newBalance === 0 ? dto.method : null,
      },
      include: { items: true, payments: { orderBy: { date: 'asc' } } },
    });

    return { payment, invoice: updated };
  }

  // Récupérer l'historique des versements d'une facture
  async getPayments(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, number: true, total: true, paidAmount: true, balance: true, status: true },
    });
    if (!invoice) throw new NotFoundException(`Facture ${invoiceId} introuvable`);

    const payments = await this.prisma.invoicePayment.findMany({
      where: { invoiceId },
      orderBy: { date: 'asc' },
    });

    return { ...invoice, payments };
  }

  async updateStatus(id: string, status: string, paymentMethod?: string) {
    const data: any = { status };
    if (status === 'paid') {
      data.paidAt = new Date();
      if (paymentMethod) data.paymentMethod = paymentMethod;
    }
    return this.prisma.invoice.update({
      where: { id },
      data,
      include: { items: true, payments: true },
    });
  }

  async getStats() {
    const [total, paid, partial, pending, overdue, totalPaidAmount, totalOutstanding] = await Promise.all([
      this.prisma.invoice.count(),
      this.prisma.invoice.count({ where: { status: 'paid' } }),
      this.prisma.invoice.count({ where: { status: 'partial' } }),
      this.prisma.invoice.count({ where: { status: { in: ['draft', 'sent'] } } }),
      this.prisma.invoice.count({ where: { status: 'overdue' } }),
      this.prisma.invoice.aggregate({ where: { status: 'paid' }, _sum: { total: true } }),
      this.prisma.invoice.aggregate({ where: { status: { in: ['partial', 'sent'] } }, _sum: { balance: true } }),
    ]);

    return {
      total,
      paid,
      partial,
      pending,
      overdue,
      totalPaidAmount: totalPaidAmount._sum.total || 0,
      totalOutstanding: totalOutstanding._sum.balance || 0,
    };
  }

  async remove(id: string) {
    // Supprimer d'abord les versements, puis les items, puis la facture
    await this.prisma.invoicePayment.deleteMany({ where: { invoiceId: id } });
    await this.prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
    return this.prisma.invoice.delete({ where: { id } });
  }
}
