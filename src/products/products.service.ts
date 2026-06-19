import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductDto } from './dto/search-product.dto';

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
}
