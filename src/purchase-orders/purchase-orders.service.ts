import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [orders, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: true,
          items: true,
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    return this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findBySupplier(supplierId: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { supplierId },
      include: {
        supplier: true,
        items: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async create(dto: CreatePurchaseOrderDto, createdBy?: string) {
    const year = new Date().getFullYear();
    const count = await this.prisma.purchaseOrder.count({
      where: {
        orderNumber: { startsWith: `BC-${year}-` },
      },
    });
    const orderNumber = `BC-${year}-${String(count + 1).padStart(4, '0')}`;

    const total = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0,
    );

    return this.prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: dto.supplierId,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : new Date(),
        notes: dto.notes,
        total,
        status: 'draft',
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            total: item.quantity * item.unitCost,
          })),
        },
      },
      include: {
        supplier: true,
        items: true,
      },
    });
  }

  async createAndReceive(dto: CreatePurchaseOrderDto, invoiceNumber?: string, createdBy?: string) {
    const year = new Date().getFullYear();
    const count = await this.prisma.purchaseOrder.count({
      where: {
        orderNumber: { startsWith: `BC-${year}-` },
      },
    });
    const orderNumber = `BC-${year}-${String(count + 1).padStart(4, '0')}`;

    const total = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0,
    );

    const notes = [dto.notes, invoiceNumber ? `Facture fournisseur: ${invoiceNumber}` : null].filter(Boolean).join(' | ');

    // Create order and update stock (sequential — $transaction fails on Neon pooler)
    const order = await this.prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: dto.supplierId,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : new Date(),
        notes,
        total,
        status: 'received',
        receivedDate: new Date(),
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            total: item.quantity * item.unitCost,
            receivedQuantity: item.quantity,
          })),
        },
      },
      include: {
        supplier: true,
        items: true,
      },
    });

    for (const item of dto.items) {
      try {
        await this.prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
          },
        });

        await this.prisma.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'in',
            quantity: item.quantity,
            reason: 'purchase',
            reference: invoiceNumber || order.orderNumber,
            notes: `Réception achat ${order.orderNumber}${invoiceNumber ? ` — Facture: ${invoiceNumber}` : ''}`,
            createdBy: createdBy || undefined,
          },
        });
      } catch (e) {
        console.error(`Stock update failed for product ${item.productId}:`, e);
      }
    }

    return order;
  }

  async updateStatus(id: string, status: string, createdBy?: string) {
    if (status === 'received') {
      const order = await this.prisma.purchaseOrder.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!order) {
        throw new NotFoundException(`Purchase order #${id} not found`);
      }

      // Increment stock for each item + create stock movements (sequential)
      for (const item of order.items) {
        try {
          await this.prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
            },
          });

          await this.prisma.stockMovement.create({
            data: {
              productId: item.productId,
              type: 'in',
              quantity: item.quantity,
              reason: 'purchase',
              reference: order.orderNumber,
              notes: `Réception commande ${order.orderNumber}`,
              createdBy: createdBy || undefined,
            },
          });
        } catch (e) {
          console.error(`Stock update failed for product ${item.productId}:`, e);
        }
      }

      return this.prisma.purchaseOrder.update({
        where: { id },
        data: {
          status,
          receivedDate: new Date(),
        },
        include: {
          supplier: true,
          items: true,
        },
      });
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status },
      include: {
        supplier: true,
        items: true,
      },
    });
  }
}
