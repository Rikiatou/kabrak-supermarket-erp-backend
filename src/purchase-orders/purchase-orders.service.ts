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
          items: {
            include: {
              product: true,
            },
          },
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
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async create(dto: CreatePurchaseOrderDto, createdBy?: string) {
    const year = new Date().getFullYear();
    const existing = await this.prisma.purchaseOrder.findMany({
      where: { orderNumber: { startsWith: `BC-${year}-` } },
      select: { orderNumber: true },
    });
    const maxSeq = existing.reduce((max, po) => {
      const seq = parseInt(po.orderNumber.split('-')[2] || '0', 10);
      return seq > max ? seq : max;
    }, 0);
    const orderNumber = `BC-${year}-${String(maxSeq + 1).padStart(4, '0')}`;

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
        createdBy: dto.createdBy || createdBy || null,
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
    const existing = await this.prisma.purchaseOrder.findMany({
      where: { orderNumber: { startsWith: `BC-${year}-` } },
      select: { orderNumber: true },
    });
    const maxSeq = existing.reduce((max, po) => {
      const seq = parseInt(po.orderNumber.split('-')[2] || '0', 10);
      return seq > max ? seq : max;
    }, 0);
    const orderNumber = `BC-${year}-${String(maxSeq + 1).padStart(4, '0')}`;

    // Étape 1: Créer les nouveaux produits s'il y en a (avant la transaction)
    const resolvedItems: Array<{ productId: string; quantity: number; unitCost: number; sellPrice?: number; expiryDate?: string }> = [];
    for (const item of dto.items) {
      if (item.isNewProduct && item.newProductName) {
        try {
          // Générer SKU et barcode auto si non fournis
          const prodCount = await this.prisma.product.count();
          const autoSku = item.newProductBarcode || `PRD-${String(prodCount + 1).padStart(5, '0')}`;
          const newProduct = await this.prisma.product.create({
            data: {
              sku: autoSku,
              barcode: item.newProductBarcode || autoSku,
              name: item.newProductName,
              category: item.newProductCategory || 'Grocery',
              unit: item.newProductUnit || 'pc',
              price: item.sellPrice || item.unitCost,
              costPrice: item.unitCost,
              taxRate: 0,
              stock: 0, // Le stock sera incrémenté ci-dessous
              minStock: 10,
              isActive: true,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
              supplierId: dto.supplierId,
            },
          });
          resolvedItems.push({
            productId: newProduct.id,
            quantity: item.quantity,
            unitCost: item.unitCost,
            sellPrice: item.sellPrice,
            expiryDate: item.expiryDate,
          });
        } catch (e) {
          console.error(`Failed to create new product ${item.newProductName}:`, e);
          throw new Error(`Impossible de créer le produit: ${item.newProductName}`);
        }
      } else {
        resolvedItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          sellPrice: item.sellPrice,
          expiryDate: item.expiryDate,
        });
      }
    }

    const total = resolvedItems.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0,
    );

    const notes = [dto.notes, invoiceNumber ? `Facture fournisseur: ${invoiceNumber}` : null].filter(Boolean).join(' | ');

    // FIX: Transaction DB avec timeout généreux (60s) pour atomicité.
    // Avant: chaque product.update + stockMovement.create était séparé (20+ requêtes
    // séquentielles sans transaction). Si le pool était saturé, ça timeout.
    // Maintenant: tout est atomique, et on batch les stockMovements en une requête.
    return this.prisma.$transaction(async (tx) => {
      // Étape 2: Créer la commande avec les items résolus
      const order = await tx.purchaseOrder.create({
        data: {
          orderNumber,
          supplierId: dto.supplierId,
          expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : new Date(),
          notes,
          total,
          status: 'received',
          receivedDate: new Date(),
          createdBy: dto.createdBy || createdBy || null,
          items: {
            create: resolvedItems.map((item) => ({
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

      // Étape 3: Mettre à jour le stock + créer les stock movements en parallèle
      // (au sein de la transaction, c'est safe — tout est atomique)
      await Promise.all(resolvedItems.map((item) =>
        tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            ...(item.sellPrice ? { price: item.sellPrice } : {}),
            ...(item.expiryDate ? { expiryDate: new Date(item.expiryDate) } : {}),
          },
        }),
      ));

      // Batch: tous les stockMovements en une seule createMany
      await tx.stockMovement.createMany({
        data: resolvedItems.map((item) => ({
          productId: item.productId,
          type: 'in',
          quantity: item.quantity,
          reason: 'purchase',
          reference: invoiceNumber || order.orderNumber,
          notes: `Réception achat ${order.orderNumber}${invoiceNumber ? ` — Facture: ${invoiceNumber}` : ''}`,
          createdBy: createdBy || null,
        })),
      });

      return order;
    }, {
      maxWait: 30000,  // 30s max pour obtenir une connexion
      timeout: 60000,  // 60s pour exécuter la transaction
    });
  }

  // Ajouter des articles à un bordereau DÉJÀ reçu, sans re-réceptionner les
  // articles existants. Le stock n'est incrémenté QUE pour les nouveaux articles.
  // Sert à compléter un bordereau en plusieurs passes (ex: 8 puis 12 de plus).
  async addItems(
    id: string,
    items: CreatePurchaseOrderDto['items'],
    createdBy?: string,
  ) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException(`Purchase order #${id} not found`);
    }
    if (!items || items.length === 0) {
      return this.findOne(id);
    }

    // Résoudre les nouveaux produits (même logique que createAndReceive)
    const resolved: Array<{
      productId: string;
      quantity: number;
      unitCost: number;
      sellPrice?: number;
      expiryDate?: string;
    }> = [];
    for (const item of items) {
      if (item.isNewProduct && item.newProductName) {
        const prodCount = await this.prisma.product.count();
        const autoSku =
          item.newProductBarcode || `PRD-${String(prodCount + 1).padStart(5, '0')}`;
        const newProduct = await this.prisma.product.create({
          data: {
            sku: autoSku,
            barcode: item.newProductBarcode || autoSku,
            name: item.newProductName,
            category: item.newProductCategory || 'Grocery',
            unit: item.newProductUnit || 'pc',
            price: item.sellPrice || item.unitCost,
            costPrice: item.unitCost,
            taxRate: 0,
            stock: 0,
            minStock: 10,
            isActive: true,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            supplierId: order.supplierId,
          },
        });
        resolved.push({
          productId: newProduct.id,
          quantity: item.quantity,
          unitCost: item.unitCost,
          sellPrice: item.sellPrice,
          expiryDate: item.expiryDate,
        });
      } else {
        resolved.push({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          sellPrice: item.sellPrice,
          expiryDate: item.expiryDate,
        });
      }
    }

    // FIX: Transaction DB pour atomicité + batch (au lieu de 3N requêtes séquentielles)
    let addedTotal = 0;
    for (const item of resolved) {
      addedTotal += item.quantity * item.unitCost;
    }

    await this.prisma.$transaction(async (tx) => {
      // Batch: tous les items du bordereau en une seule createMany
      await tx.purchaseOrderItem.createMany({
        data: resolved.map((item) => ({
          purchaseOrderId: id,
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          total: item.quantity * item.unitCost,
          receivedQuantity: item.quantity,
        })),
      });

      // Batch: tous les product updates en parallèle
      await Promise.all(resolved.map((item) =>
        tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            ...(item.sellPrice ? { price: item.sellPrice } : {}),
            ...(item.expiryDate ? { expiryDate: new Date(item.expiryDate) } : {}),
          },
        }),
      ));

      // Batch: tous les stockMovements en une seule createMany
      await tx.stockMovement.createMany({
        data: resolved.map((item) => ({
          productId: item.productId,
          type: 'in',
          quantity: item.quantity,
          reason: 'purchase',
          reference: order.orderNumber,
          notes: `Ajout au bordereau ${order.orderNumber}`,
          createdBy: createdBy || null,
        })),
      });

      // Mettre à jour le total du bordereau (+ marquer à re-synchroniser)
      await tx.purchaseOrder.update({
        where: { id },
        data: {
          total: { increment: addedTotal },
          syncStatus: 'pending',
        },
      });
    }, {
      maxWait: 30000,
      timeout: 60000,
    });

    return this.findOne(id);
  }

  // Modifier un article existant d'un bordereau (correction de quantité/coût).
  // Ajuste le stock du delta et garde la DATE ORIGINALE du bordereau intacte.
  // quantity = 0 supprime l'article.
  async updateItem(
    orderId: string,
    itemId: string,
    data: { quantity?: number; unitCost?: number },
    createdBy?: string,
  ) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException(`Purchase order #${orderId} not found`);
    }
    const item = await this.prisma.purchaseOrderItem.findUnique({
      where: { id: itemId },
    });
    if (!item || item.purchaseOrderId !== orderId) {
      throw new NotFoundException(`Item #${itemId} not found in order`);
    }

    const oldQty = item.quantity;
    const newQty = data.quantity != null ? data.quantity : oldQty;
    const newCost = data.unitCost != null ? data.unitCost : item.unitCost;
    const delta = newQty - oldQty; // >0 = reçu plus, <0 = reçu moins

    const oldItemTotal = item.total;
    const newItemTotal = newQty > 0 ? newQty * newCost : 0;

    // FIX: Transaction DB pour atomicité
    await this.prisma.$transaction(async (tx) => {
      // Ajuster le stock du produit selon le delta
      if (delta !== 0) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: delta }, syncStatus: 'pending' },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: delta > 0 ? 'in' : 'out',
            quantity: delta,
            reason: 'purchase',
            reference: order.orderNumber,
            notes: `Correction bordereau ${order.orderNumber}: ${oldQty} → ${newQty}`,
            createdBy: createdBy || null,
          },
        });
      }

      if (newQty <= 0) {
        // Supprimer l'article
        await tx.purchaseOrderItem.delete({ where: { id: itemId } });
      } else {
        await tx.purchaseOrderItem.update({
          where: { id: itemId },
          data: {
            quantity: newQty,
            unitCost: newCost,
            total: newQty * newCost,
            receivedQuantity: newQty,
          },
        });
      }

      // Recalculer le total du bordereau (garde la date originale intacte)
      await tx.purchaseOrder.update({
        where: { id: orderId },
        data: {
          total: { increment: newItemTotal - oldItemTotal },
          syncStatus: 'pending',
        },
      });
    }, {
      maxWait: 30000,
      timeout: 60000,
    });

    return this.findOne(orderId);
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

      // FIX: Transaction DB + batch (au lieu de 2N requêtes séquentielles)
      return this.prisma.$transaction(async (tx) => {
        // Batch: tous les product updates en parallèle
        await Promise.all(order.items.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
            },
          }),
        ));

        // Batch: tous les stockMovements en une seule createMany
        await tx.stockMovement.createMany({
          data: order.items.map((item) => ({
            productId: item.productId,
            type: 'in',
            quantity: item.quantity,
            reason: 'purchase',
            reference: order.orderNumber,
            notes: `Réception commande ${order.orderNumber}`,
            createdBy: createdBy || null,
          })),
        });

        return tx.purchaseOrder.update({
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
      }, {
        maxWait: 30000,
        timeout: 60000,
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
