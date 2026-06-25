import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search } },
            { customerNumber: { contains: search } },
          ],
        }
      : {};

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    return this.prisma.customer.findUnique({
      where: { id },
      include: {
        loyaltyHistory: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        transactions: {
          orderBy: { date: 'desc' },
          take: 10,
          select: {
            id: true,
            transactionNumber: true,
            date: true,
            total: true,
            status: true,
            paymentMethod: true,
          },
        },
      },
    });
  }

  async create(dto: CreateCustomerDto) {
    const count = await this.prisma.customer.count();
    const customerNumber = `KAB-${String(count + 1).padStart(6, '0')}`;

    // Vérifier si le téléphone existe déjà
    const existing = await this.prisma.customer.findUnique({
      where: { phone: dto.phone },
    });
    if (existing) {
      return existing; // Retourner le client existant au lieu d'échouer
    }

    return this.prisma.customer.create({
      data: {
        customerNumber,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        email: dto.email || null, // Convertir "" en null
      },
    });
  }

  async update(id: string, dto: Partial<CreateCustomerDto>) {
    const { address, ...data } = dto;
    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }

  async getLoyaltyHistory(customerId: string) {
    return this.prisma.loyaltyHistory.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async redeemPoints(customerId: string, points: number) {
    const customer = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        points: { decrement: points },
      },
    });

    await this.prisma.loyaltyHistory.create({
      data: {
        customerId,
        points: -points,
        reason: 'reward_redeemed',
      },
    });

    return customer;
  }

  async getStats() {
    const [totalCustomers, pointsAgg, redeemedAgg] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.loyaltyHistory.aggregate({
        where: { points: { gt: 0 } },
        _sum: { points: true },
      }),
      this.prisma.loyaltyHistory.aggregate({
        where: { points: { lt: 0 } },
        _sum: { points: true },
      }),
    ]);

    return {
      totalCustomers,
      totalPointsIssued: pointsAgg._sum.points || 0,
      totalPointsRedeemed: Math.abs(redeemedAgg._sum.points || 0),
    };
  }
}
