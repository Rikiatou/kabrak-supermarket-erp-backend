import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class BatchesService {
  constructor(private prisma: PrismaService) {}

  // Lister tous les lots d'un produit
  async findByProduct(productId: string) {
    return this.prisma.productBatch.findMany({
      where: { productId },
      orderBy: { expiryDate: 'asc' }, // FIFO: les plus anciens en premier
    });
  }

  // Lister tous les lots (avec info produit) — pour vue globale stocks
  async findAll(licenseKey?: string, expiringOnly?: boolean) {
    const where: any = {};
    if (licenseKey) where.licenseKey = licenseKey;
    if (expiringOnly) {
      // Lots expirant dans les 30 prochains jours
      const now = new Date();
      const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      where.expiryDate = { lte: in30, gte: now };
      where.quantity = { gt: 0 };
    }
    return this.prisma.productBatch.findMany({
      where,
      include: { product: { select: { id: true, name: true, barcode: true, price: true, category: true } } },
      orderBy: { expiryDate: 'asc' },
      take: 200,
    });
  }

  // Créer un nouveau lot (à la réception de marchandise)
  async create(data: {
    productId: string;
    batchNumber?: string;
    quantity: number;
    expiryDate?: string;
    licenseKey?: string;
  }) {
    const batch = await this.prisma.productBatch.create({
      data: {
        productId: data.productId,
        batchNumber: data.batchNumber || null,
        quantity: data.quantity,
        initialQty: data.quantity,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        licenseKey: data.licenseKey || null,
      },
    });

    // Mettre à jour le stock total du produit
    await this.prisma.product.update({
      where: { id: data.productId },
      data: { stock: { increment: data.quantity } },
    });

    // Mettre à jour la date d'expiration du produit = date du lot le plus proche
    await this.updateProductExpiry(data.productId);

    return batch;
  }

  // Décrémenter un lot (FIFO — on prend le lot qui expire le plus tôt)
  async decrementFIFO(productId: string, quantity: number): Promise<void> {
    const batches = await this.prisma.productBatch.findMany({
      where: { productId, quantity: { gt: 0 } },
      orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }],
    });

    let remaining = quantity;
    for (const batch of batches) {
      if (remaining <= 0) break;
      const take = Math.min(batch.quantity, remaining);
      await this.prisma.productBatch.update({
        where: { id: batch.id },
        data: { quantity: { decrement: take } },
      });
      remaining -= take;
    }

    // Si on n'a pas pu tout décrémenter (stock insuffisant en lots), on log
    if (remaining > 0) {
      console.warn(`Batch FIFO: ${remaining} units not found in batches for product ${productId}`);
    }
  }

  // Mettre à jour la date d'expiration du produit = lot le plus proche non vide
  async updateProductExpiry(productId: string): Promise<void> {
    const oldestBatch = await this.prisma.productBatch.findFirst({
      where: { productId, quantity: { gt: 0 }, expiryDate: { not: null } },
      orderBy: { expiryDate: 'asc' },
    });
    if (oldestBatch?.expiryDate) {
      await this.prisma.product.update({
        where: { id: productId },
        data: { expiryDate: oldestBatch.expiryDate },
      });
    }
  }

  // Supprimer un lot vide
  async remove(id: string) {
    return this.prisma.productBatch.delete({ where: { id } });
  }

  // Stats: alertes d'expiration par lot
  async expiryAlerts(licenseKey?: string) {
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const where: any = { quantity: { gt: 0 } };
    if (licenseKey) where.licenseKey = licenseKey;

    const expired = await this.prisma.productBatch.findMany({
      where: { ...where, expiryDate: { lt: now } },
      include: { product: { select: { id: true, name: true, barcode: true, price: true } } },
    });

    const expiring7 = await this.prisma.productBatch.findMany({
      where: { ...where, expiryDate: { gte: now, lte: in7 } },
      include: { product: { select: { id: true, name: true, barcode: true, price: true } } },
    });

    const expiring30 = await this.prisma.productBatch.findMany({
      where: { ...where, expiryDate: { gt: in7, lte: in30 } },
      include: { product: { select: { id: true, name: true, barcode: true, price: true } } },
    });

    return { expired, expiring7, expiring30 };
  }
}
