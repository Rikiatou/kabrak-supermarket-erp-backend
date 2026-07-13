import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductDto } from './dto/search-product.dto';
import { SetMarkdownDto } from './dto/set-markdown.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // Créer un produit
  async create(createProductDto: CreateProductDto) {
    // Ne vérifier les doublons QUE sur les valeurs réellement fournies
    // (sinon un OR avec des undefined matche n'importe quel produit → faux "existe déjà")
    const orConditions: any[] = [];
    if (createProductDto.sku) orConditions.push({ sku: createProductDto.sku });
    if (createProductDto.barcode) orConditions.push({ barcode: createProductDto.barcode });

    if (orConditions.length > 0) {
      const existing = await this.prisma.product.findFirst({
        where: { OR: orConditions },
      });
      if (existing) {
        // Si le produit existant a été supprimé (soft-delete), on le réactive
        // avec les nouvelles données au lieu de bloquer la recréation.
        // Sinon le code-barres unique reste "occupé" par un produit invisible
        // dans la liste mais toujours visible au POS.
        if (!existing.isActive) {
          return this.reactivate(existing.id, createProductDto);
        }
        throw new ConflictException(
          `Produit avec SKU "${createProductDto.sku}" ou barcode "${createProductDto.barcode}" existe déjà`,
        );
      }
    }

    // SKU et barcode sont obligatoires et uniques en base.
    // Si le stockiste n'en fournit pas (produit sans code-barres), on en génère
    // un unique automatiquement pour permettre la création.
    const uniqueSuffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    const data: any = {
      ...createProductDto,
      sku: createProductDto.sku || `SKU-${uniqueSuffix}`,
      barcode: createProductDto.barcode || `AUTO-${uniqueSuffix}`,
    };
    // Convertir expiryDate (string ISO) en Date pour Prisma
    if (createProductDto.expiryDate) {
      data.expiryDate = new Date(createProductDto.expiryDate);
    } else {
      delete data.expiryDate;
    }

    const product = await this.prisma.product.create({
      data,
      include: {
        supplier: true,
      },
    });

    // Create initial stock movement if stock > 0
    if (product.stock > 0) {
      await this.prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: 'in',
          quantity: product.stock,
          reason: 'initial',
          reference: 'INITIAL STOCK',
          notes: 'Initial stock on product creation',
        },
      });
    }

    return product;
  }

  // Réactiver un produit soft-supprimé lors d'une "recréation".
  // On applique les nouvelles données fournies et on remet isActive=true.
  private async reactivate(id: string, dto: CreateProductDto) {
    const data: any = { ...dto, isActive: true };
    if (dto.expiryDate) {
      data.expiryDate = new Date(dto.expiryDate);
    } else {
      delete data.expiryDate;
    }
    // Ne pas écraser sku/barcode par des valeurs vides
    if (!dto.sku) delete data.sku;
    if (!dto.barcode) delete data.barcode;

    const product = await this.prisma.product.update({
      where: { id },
      data,
      include: { supplier: true },
    });

    if (product.stock > 0) {
      await this.prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: 'in',
          quantity: product.stock,
          reason: 'initial',
          reference: 'REACTIVATION',
          notes: 'Stock défini lors de la réactivation du produit',
        },
      });
    }

    return product;
  }

  // Liste paginée
  async findAll(page: number = 1, limit: number = 100) {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        skip,
        take: limit,
        where: { isActive: true },
        include: {
          supplier: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where: { isActive: true } }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Recherche ultra-rapide (pour caisse)
  async search(searchDto: SearchProductDto) {
    const { q, category, barcode, sku, stockStatus, page = 1, limit = 100 } = searchDto;
    const skip = (page - 1) * limit;

    // Recherche par barcode exact (scan caisse)
    if (barcode) {
      const product = await this.prisma.product.findUnique({
        where: { barcode },
        include: { supplier: true },
      });
      return {
        data: product ? [product] : [],
        meta: { total: product ? 1 : 0, page: 1, limit: 1, totalPages: 1 },
      };
    }

    // Recherche par SKU exact
    if (sku) {
      const product = await this.prisma.product.findUnique({
        where: { sku },
        include: { supplier: true },
      });
      return {
        data: product ? [product] : [],
        meta: { total: product ? 1 : 0, page: 1, limit: 1, totalPages: 1 },
      };
    }

    // Recherche multi-critères
    const where: any = { isActive: true };

    if (category) {
      where.category = category;
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Filtre par statut de stock
    if (stockStatus === 'critical') {
      where.AND = [{ stock: 0 }];
    } else if (stockStatus === 'low') {
      where.AND = [{ stock: { gt: 0 } }, { minStock: { gt: 0 } }];
      // stock > 0 et stock <= minStock
      where.AND = [{ stock: { gt: 0 } }, { minStock: { gt: 0 } }];
    } else if (stockStatus === 'ok') {
      where.AND = [{ stock: { gt: 0 } }];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: { supplier: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Trouver par ID
  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        supplier: true,
        stockMovements: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Produit #${id} non trouvé`);
    }

    return product;
  }

  // Trouver par barcode (pour caisse) — cherche aussi par packBarcode
  async findByBarcode(barcode: string) {
    // D'abord chercher par barcode unité
    let product = await this.prisma.product.findUnique({
      where: { barcode },
      include: { supplier: true },
    });

    // Si pas trouvé, chercher par packBarcode
    if (!product) {
      product = await this.prisma.product.findFirst({
        where: { packBarcode: barcode },
        include: { supplier: true },
      });
    }

    if (!product) {
      throw new NotFoundException(`Produit avec barcode "${barcode}" non trouvé`);
    }

    return product;
  }

  // Mettre à jour
  async update(id: string, updateProductDto: UpdateProductDto) {
    // Vérifier si existe
    await this.findOne(id);

    // Vérifier unicité SKU/barcode si modifiés (uniquement sur les valeurs fournies)
    const orConditions: any[] = [];
    if (updateProductDto.sku) orConditions.push({ sku: updateProductDto.sku });
    if (updateProductDto.barcode) orConditions.push({ barcode: updateProductDto.barcode });

    if (orConditions.length > 0) {
      const existing = await this.prisma.product.findFirst({
        where: {
          AND: [{ id: { not: id } }, { OR: orConditions }],
        },
      });

      if (existing) {
        throw new ConflictException('SKU ou barcode déjà utilisé par un autre produit');
      }
    }

    // Convertir expiryDate (string ISO) en Date pour Prisma
    const data: any = { ...updateProductDto };
    if (updateProductDto.expiryDate) {
      data.expiryDate = new Date(updateProductDto.expiryDate);
    } else if ('expiryDate' in data) {
      delete data.expiryDate;
    }

    return this.prisma.product.update({
      where: { id },
      data,
      include: { supplier: true },
    });
  }

  // Supprimer (soft delete)
  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // Alertes stock
  async getStockAlerts() {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { stock: { lte: this.prisma.product.fields.minStock } },
          {
            expiryDate: {
              lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
            },
          },
        ],
      },
      include: { supplier: true },
      orderBy: { stock: 'asc' },
    });
  }

  // Statistiques
  async getStats() {
    const [total, lowStock, expiring, outOfStock] = await Promise.all([
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.product.count({
        where: {
          isActive: true,
          stock: { lte: this.prisma.product.fields.minStock },
        },
      }),
      this.prisma.product.count({
        where: {
          isActive: true,
          expiryDate: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.product.count({
        where: { isActive: true, stock: 0 },
      }),
    ]);

    return {
      total,
      lowStock,
      expiring,
      outOfStock,
      healthy: total - lowStock - expiring - outOfStock,
    };
  }

  // ========================================
  // MARKDOWN / PROMOTIONS
  // ========================================

  // Appliquer un markdown sur un produit
  async setMarkdown(id: string, dto: SetMarkdownDto) {
    const product = await this.findOne(id);

    // Validation: le prix markdown doit être inférieur au prix normal
    if (dto.markdownPrice >= product.price) {
      throw new BadRequestException(
        `Le prix markdown (${dto.markdownPrice}) doit être inférieur au prix normal (${product.price})`,
      );
    }

    // Validation: ne pas vendre à perte sauf si raison = expiry/clearance
    if (dto.markdownPrice < product.costPrice && !['expiry', 'clearance'].includes(dto.markdownReason)) {
      throw new BadRequestException(
        `Vente à perte (${dto.markdownPrice} < coût ${product.costPrice}) autorisée uniquement pour expiry/clearance`,
      );
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        markdownPrice: dto.markdownPrice,
        markdownReason: dto.markdownReason,
        markdownNote: dto.markdownNote || null,
        markdownStartsAt: new Date(),
        markdownExpiresAt: dto.markdownExpiresAt ? new Date(dto.markdownExpiresAt) : null,
      },
      include: { supplier: true },
    });
  }

  // Retirer le markdown (restaurer le prix normal)
  async removeMarkdown(id: string) {
    await this.findOne(id);

    return this.prisma.product.update({
      where: { id },
      data: {
        markdownPrice: null,
        markdownReason: null,
        markdownNote: null,
        markdownStartsAt: null,
        markdownExpiresAt: null,
      },
      include: { supplier: true },
    });
  }

  // Lister tous les produits en markdown actif
  async getMarkdowns(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const now = new Date();

    const where = {
      isActive: true,
      markdownPrice: { not: null },
      // Exclure les markdowns expirés (si markdownExpiresAt est dans le passé)
      OR: [
        { markdownExpiresAt: null },
        { markdownExpiresAt: { gt: now } },
      ],
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: { supplier: true },
        orderBy: { markdownStartsAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Calculer la valeur perdue (différence prix normal - prix markdown) × stock
    const totalPotentialLoss = products.reduce(
      (sum, p) => sum + (p.price - (p.markdownPrice || p.price)) * p.stock,
      0,
    );

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        count: total,
        totalPotentialLoss,
      },
    };
  }

  // Nettoyer les markdowns expirés (cron job — restaure le prix normal)
  async cleanupExpiredMarkdowns() {
    const now = new Date();

    const expired = await this.prisma.product.findMany({
      where: {
        markdownPrice: { not: null },
        markdownExpiresAt: { lt: now },
      },
      select: { id: true, name: true, markdownPrice: true, price: true },
    });

    if (expired.length === 0) {
      return { cleaned: 0, products: [] };
    }

    await this.prisma.product.updateMany({
      where: {
        id: { in: expired.map((p) => p.id) },
      },
      data: {
        markdownPrice: null,
        markdownReason: null,
        markdownNote: null,
        markdownStartsAt: null,
        markdownExpiresAt: null,
      },
    });

    return {
      cleaned: expired.length,
      products: expired.map((p) => ({
        id: p.id,
        name: p.name,
        restoredPrice: p.price,
        wasMarkdownPrice: p.markdownPrice,
      })),
    };
  }

  // ========================================
  // BESTSELLERS & CATÉGORIES
  // ========================================

  // Top produits vendus (pour cache local du POS)
  async getBestsellers(limit: number = 200) {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const items = await this.prisma.transactionItem.groupBy({
      by: ['productId'],
      where: {
        transaction: {
          date: { gte: startOfMonth },
          status: 'completed',
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const products = await this.prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
      select: {
        id: true,
        sku: true,
        barcode: true,
        name: true,
        price: true,
        stock: true,
        category: true,
        unit: true,
        markdownPrice: true,
        imageUrl: true,
        isActive: true,
      },
    });

    // Trier selon l'ordre des bestsellers
    const sorted = items
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        return { ...product, soldQuantity: item._sum.quantity || 0 };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    return sorted;
  }

  // Lister toutes les catégories distinctes
  async getCategories() {
    const result = await this.prisma.product.findMany({
      where: { isActive: true },
      select: { category: true, subCategory: true },
      distinct: ['category', 'subCategory'],
    });

    // Grouper par catégorie
    const categories: Record<string, string[]> = {};
    for (const r of result) {
      if (!categories[r.category]) categories[r.category] = [];
      if (r.subCategory && !categories[r.category].includes(r.subCategory)) {
        categories[r.category].push(r.subCategory);
      }
    }

    return Object.entries(categories).map(([name, subs]) => ({
      name,
      subCategories: subs,
      productCount: 0,
    }));
  }
}
