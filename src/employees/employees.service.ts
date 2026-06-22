import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async findAll(activeOnly: boolean = true) {
    return this.prisma.employee.findMany({
      where: activeOnly ? { status: { not: 'inactive' } } : {},
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        phone: true,
        email: true,
        hireDate: true,
        status: true,
      },
      orderBy: [{ status: 'asc' }, { firstName: 'asc' }],
    });
  }

  async findOne(id: string) {
    return this.prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        phone: true,
        email: true,
        hireDate: true,
        status: true,
        transactions: {
          take: 10,
          orderBy: { date: 'desc' },
          select: {
            id: true,
            transactionNumber: true,
            date: true,
            total: true,
            status: true,
          },
        },
      },
    });
  }

  async create(data: any) {
    return this.prisma.employee.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.employee.update({ where: { id }, data });
  }

  async getStats() {
    const [total, active, onLeave, byRole] = await Promise.all([
      this.prisma.employee.count(),
      this.prisma.employee.count({ where: { status: 'active' } }),
      this.prisma.employee.count({ where: { status: 'on_leave' } }),
      this.prisma.employee.groupBy({
        by: ['role'],
        _count: true,
      }),
    ]);

    return { total, active, onLeave, byRole };
  }
}
