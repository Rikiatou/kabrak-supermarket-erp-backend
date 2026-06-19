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
    // Vérifier si SKU ou barcode existe déjà
    const existing = await this.prisma.product.findFirst({
      where: {
        OR: [
          { sku: createProductDto.sku },
          { barcode: createProductDto.barcode },
        ],
      },
    });

    if (existing) {
      throw new ConflictException(
        `Produit avec SKU "${createProductDto.sku}" ou barcode "${createProductDto.barcode}" existe déjà`,
      );
    }

    return this.prisma.product.create({
      data: createProductDto,
      include: {
        supplier: true,
      },
    });
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
    const { q, category, barcode, sku, page = 1, limit = 100 } = searchDto;
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

  // Trouver par barcode (pour caisse)
  async findByBarcode(barcode: string) {
    const product = await this.prisma.product.findUnique({
      where: { barcode },
      include: { supplier: true },
    });

    if (!product) {
      throw new NotFoundException(`Produit avec barcode "${barcode}" non trouvé`);
    }

    return product;
  }

  // Mettre à jour
  async update(id: string, updateProductDto: UpdateProductDto) {
    // Vérifier si existe
    await this.findOne(id);

    // Vérifier unicité SKU/barcode si modifiés
    if (updateProductDto.sku || updateProductDto.barcode) {
      const existing = await this.prisma.product.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                updateProductDto.sku ? { sku: updateProductDto.sku } : {},
                updateProductDto.barcode ? { barcode: updateProductDto.barcode } : {},
              ],
            },
          ],
        },
      });

      if (existing) {
        throw new ConflictException('SKU ou barcode déjà utilisé par un autre produit');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
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
}
