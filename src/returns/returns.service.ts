import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ReturnsService {
  constructor(private prisma: PrismaService) {}

  async create(
    dto: {
      originalTransactionId?: string;
      originalInvoiceId?: string;
      clientName?: string;
      reason: string;
      resolution: string;
      note?: string;
      refundMethod?: string;
      items: Array<{
        productId?: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        total: number;
        exchangeProductId?: string;
        exchangeProductName?: string;
        exchangeTotal?: number;
      }>;
    },
    licenseKey?: string,
    createdBy?: string,
  ) {
    const totalRefunded = dto.items.reduce((sum, item) => sum + item.total, 0);

    // Create the return record
    const ret = await this.prisma.productReturn.create({
      data: {
        licenseKey: licenseKey || null,
        originalTransactionId: dto.originalTransactionId || null,
        originalInvoiceId: dto.originalInvoiceId || null,
        clientName: dto.clientName || null,
        reason: dto.reason,
        resolution: dto.resolution,
        note: dto.note || null,
        refundMethod: dto.refundMethod || null,
        totalRefunded,
        status: 'completed',
        createdBy: createdBy || null,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId || null,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            exchangeProductId: item.exchangeProductId || null,
            exchangeProductName: item.exchangeProductName || null,
            exchangeTotal: item.exchangeTotal || null,
          })),
        },
      },
      include: { items: true },
    });

    // Update stock: add back returned quantities
    for (const item of dto.items) {
      if (item.productId) {
        await this.prisma.product
          .update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
          .catch(() => {}); // ignore if product not found

        // Create stock movement
        await this.prisma.stockMovement
          .create({
            data: {
              productId: item.productId,
              type: 'in',
              quantity: item.quantity,
              reason: 'return',
              reference: ret.id,
              notes: `Retour client — ${dto.reason}`,
              licenseKey: licenseKey || null,
            },
          })
          .catch(() => {});
      }
    }

    return ret;
  }

  async findAll(licenseKey?: string) {
    return this.prisma.productReturn.findMany({
      where: licenseKey ? { licenseKey } : {},
      include: { items: true },
      orderBy: { returnDate: 'desc' },
      take: 100,
    });
  }

  async getStats(licenseKey?: string) {
    const returns = await this.prisma.productReturn.findMany({
      where: licenseKey ? { licenseKey } : {},
      include: { items: true },
    });
    const total = returns.length;
    const totalAmount = returns.reduce((s, r) => s + r.totalRefunded, 0);
    const byReason = returns.reduce(
      (acc, r) => {
        acc[r.reason] = (acc[r.reason] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    return { total, totalAmount, byReason };
  }
}
