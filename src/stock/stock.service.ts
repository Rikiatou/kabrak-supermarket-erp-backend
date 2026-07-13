import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  // Créer un mouvement de stock
  async createMovement(dto: CreateStockMovementDto) {
    // Sequential queries — $transaction fails on Neon pooler
    const movement = await this.prisma.stockMovement.create({
      data: {
        ...dto,
        syncStatus: 'pending',
      },
      include: { product: true },
    });

    await this.prisma.product.update({
      where: { id: dto.productId },
      data: {
        stock: {
          increment: dto.quantity,
        },
      },
    });

    return movement;
  }

  // Liste des mouvements
  async findAllMovements(
    page: number = 1,
    limit: number = 50,
    productId?: string,
    type?: string,
    negativeOnly?: boolean,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (productId) {
      where.productId = productId;
    }

    if (type) {
      where.type = type;
    }

    if (negativeOnly) {
      where.quantity = { lt: 0 };
    }

    const [movements, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: true,
          employee: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      data: movements,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Alertes stock
  async getAlerts() {
    const [lowStock, outOfStock, expiringSoon, expired] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          isActive: true,
          stock: { gt: 0 },
        },
        orderBy: { stock: 'asc' },
      }).then(products => products.filter(p => p.stock <= p.minStock)),
      this.prisma.product.findMany({
        where: { isActive: true, stock: 0 },
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.findMany({
        where: {
          isActive: true,
          expiryDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { expiryDate: 'asc' },
      }),
      this.prisma.product.findMany({
        where: {
          isActive: true,
          expiryDate: { lt: new Date() },
        },
        orderBy: { expiryDate: 'asc' },
      }),
    ]);

    return {
      lowStock,
      outOfStock,
      expiringSoon,
      expired,
      summary: {
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
        expiringSoonCount: expiringSoon.length,
        expiredCount: expired.length,
      },
    };
  }

  // Mouvements en attente de sync
  async findPendingSync() {
    return this.prisma.stockMovement.findMany({
      where: { syncStatus: 'pending' },
      include: {
        product: true,
        employee: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });
  }

  // Marquer comme synchronisé
  async markAsSynced(id: string) {
    return this.prisma.stockMovement.update({
      where: { id },
      data: { syncStatus: 'synced', syncedAt: new Date() },
    });
  }

  // Ajustement d'inventaire
  async adjustInventory(productId: string, newStock: number, reason: string, createdBy?: string) {
    if (newStock < 0) {
      throw new BadRequestException('Le stock ne peut pas être négatif');
    }
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Produit #${productId} non trouvé`);
    }

    const difference = newStock - product.stock;

    const movement = await this.prisma.stockMovement.create({
      data: {
        productId,
        type: 'adjustment',
        quantity: difference,
        reason,
        notes: `Ajustement inventaire: ${product.stock} → ${newStock}`,
        createdBy,
        syncStatus: 'pending',
      },
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: { stock: newStock },
    });

    return movement;
  }

  // Valeur du stock
  async getStockValue() {
    const result = await this.prisma.product.aggregate({
      where: { isActive: true },
      _sum: {
        stock: true,
      },
    });

    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: { stock: true, costPrice: true, price: true },
    });

    const totalCostValue = products.reduce(
      (sum, p) => sum + p.stock * p.costPrice,
      0,
    );
    const totalSaleValue = products.reduce(
      (sum, p) => sum + p.stock * p.price,
      0,
    );
    const potentialMargin = totalSaleValue - totalCostValue;

    return {
      totalProducts: products.length,
      totalUnits: result._sum.stock || 0,
      totalCostValue,
      totalSaleValue,
      potentialMargin,
    };
  }
}
