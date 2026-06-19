import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async findAll(activeOnly: boolean = true) {
    return this.prisma.supplier.findMany({
      where: activeOnly ? { isActive: true } : {},
      include: {
        _count: {
          select: { products: true, purchaseOrders: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.supplier.findUnique({
      where: { id },
      include: {
        products: {
          take: 20,
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            stock: true,
          },
        },
        purchaseOrders: {
          take: 10,
          orderBy: { date: 'desc' },
        },
      },
    });
  }

  async create(data: {
    name: string;
    contact: string;
    phone: string;
    email?: string;
    address?: string;
    paymentTerms?: string;
  }) {
    return this.prisma.supplier.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.supplier.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
