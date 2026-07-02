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
  async create(createProductDto: CreateProductDto, licenseKey?: string) {
    // Générer SKU et barcode automatiquement si non fournis
    const count = await this.prisma.product.count();
    const autoSku = `PRD-${String(count + 1).padStart(5, '0')}`;
    const autoBarcode = `2${String(count + 1).padStart(12, '0')}`;

    const sku = createProductDto.sku || autoSku;
    const barcode = createProductDto.barcode || autoBarcode;

    // Vérifier si SKU ou barcode existe déjà
    const existing = await this.prisma.product.findFirst({
      where: {
        OR: [
          { sku },
          { barcode },
        ],
      },
    });

    if (existing) {
      throw new ConflictException(
        `Produit avec SKU "${sku}" ou barcode "${barcode}" existe déjà`,
      );
    }

    return this.prisma.product.create({
      data: {
        ...createProductDto,
        sku,
        barcode,
        ...(licenseKey ? { licenseKey } : {}),
      },
      include: {
        supplier: true,
      },
    });
  }

  // Filtre tenant: produits du client OU produits sans licenseKey (catalogue global)
  private tenantFilter(licenseKey?: string) {
    if (!licenseKey) return {};
    return { OR: [{ licenseKey }, { licenseKey: null }] };
  }

  // Liste paginée
  async findAll(page: number = 1, limit: number = 100, licenseKey?: string) {
    const skip = (page - 1) * limit;
    const tenantFilter = this.tenantFilter(licenseKey);

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        skip,
        take: limit,
        where: { isActive: true, ...tenantFilter },
        include: {
          supplier: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where: { isActive: true, ...tenantFilter } }),
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
  async search(searchDto: SearchProductDto, licenseKey?: string) {
    const { q, category, barcode, sku, page = 1, limit = 100 } = searchDto;
    const skip = (page - 1) * limit;
    const tenantFilter = this.tenantFilter(licenseKey);

    // Recherche par barcode exact (scan caisse)
    if (barcode) {
      const product = await this.prisma.product.findFirst({
        where: { barcode, AND: licenseKey ? [{ OR: [{ licenseKey }, { licenseKey: null }] }] : [] },
        include: { supplier: true },
      });
      return {
        data: product ? [product] : [],
        meta: { total: product ? 1 : 0, page: 1, limit: 1, totalPages: 1 },
      };
    }

    // Recherche par SKU exact
    if (sku) {
      const product = await this.prisma.product.findFirst({
        where: { sku, AND: licenseKey ? [{ OR: [{ licenseKey }, { licenseKey: null }] }] : [] },
        include: { supplier: true },
      });
      return {
        data: product ? [product] : [],
        meta: { total: product ? 1 : 0, page: 1, limit: 1, totalPages: 1 },
      };
    }

    // Recherche multi-critères — combiner tenant filter ET text search avec AND
    const andConditions: any[] = [{ isActive: true }];
    if (licenseKey) andConditions.push({ OR: [{ licenseKey }, { licenseKey: null }] });
    if (category) andConditions.push({ category });
    if (q) {
      andConditions.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      });
    }
    const where: any = { AND: andConditions };

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
  async findByBarcode(barcode: string, licenseKey?: string) {
    const tenantFilter = this.tenantFilter(licenseKey);
    const product = await this.prisma.product.findFirst({
      where: { barcode, ...tenantFilter },
      include: { supplier: true },
    });

    if (!product) {
      throw new NotFoundException(`Produit avec barcode "${barcode}" non trouvé`);
    }

    return product;
  }

  // Top produits vendus — pour cache local du POS au démarrage
  async getBestsellers(limit: number = 200, licenseKey?: string) {
    const tenantFilter = this.tenantFilter(licenseKey);

    // Récupérer les produits les plus vendus (par quantité totale vendue)
    const topItems = await this.prisma.transactionItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const productIds = topItems.map((t) => t.productId);

    // Si pas assez de ventes, compléter avec des produits par stock
    if (productIds.length < limit) {
      const extra = await this.prisma.product.findMany({
        where: {
          isActive: true,
          id: { notIn: productIds },
          ...tenantFilter,
        },
        orderBy: { stock: 'desc' },
        take: limit - productIds.length,
        select: { id: true },
      });
      productIds.push(...extra.map((p) => p.id));
    }

    // Récupérer les produits complets
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true, ...tenantFilter },
      include: { supplier: true },
    });

    // Trier selon l'ordre des bestsellers
    const orderMap = new Map(productIds.map((id, i) => [id, i]));
    products.sort((a, b) => (orderMap.get(a.id) ?? 9999) - (orderMap.get(b.id) ?? 9999));

    return { data: products, total: products.length };
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
  async getStockAlerts(licenseKey?: string) {
    const tenantFilter = this.tenantFilter(licenseKey);
    // Prisma ne supporte pas la comparaison entre deux colonnes directement
    // On récupère les produits et on filtre en mémoire
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        ...tenantFilter,
        OR: [
          { stock: { lte: 10 } }, // Seuil minimum par défaut
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
    // Filtrer ceux où stock <= minStock
    return products.filter((p) => p.stock <= p.minStock || 
      (p.expiryDate && new Date(p.expiryDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)));
  }

  // Statistiques
  async getStats(licenseKey?: string) {
    const tenantFilter = this.tenantFilter(licenseKey);
    const [total, lowStock, expiring, outOfStock] = await Promise.all([
      this.prisma.product.count({ where: { isActive: true, ...tenantFilter } }),
      this.prisma.product.count({
        where: {
          isActive: true,
          stock: { lte: 10 },
          ...tenantFilter,
        },
      }),
      this.prisma.product.count({
        where: {
          isActive: true,
          expiryDate: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          ...tenantFilter,
        },
      }),
      this.prisma.product.count({
        where: { isActive: true, stock: 0, ...tenantFilter },
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
  async getMarkdowns(page: number = 1, limit: number = 50, licenseKey?: string) {
    const skip = (page - 1) * limit;
    const now = new Date();
    const tenantFilter = this.tenantFilter(licenseKey);

    const where = {
      isActive: true,
      markdownPrice: { not: null },
      ...tenantFilter,
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
