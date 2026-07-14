import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async findAll(activeOnly: boolean = true, licenseKey?: string) {
    const baseWhere: any = activeOnly ? { status: { not: 'inactive' } } : {};
    if (licenseKey) {
      baseWhere.OR = [{ licenseKey }, { licenseKey: null }];
    }
    return this.prisma.employee.findMany({
      where: baseWhere,
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

  async create(data: any, licenseKey?: string) {
    return this.prisma.employee.create({
      data: { ...data, ...(licenseKey ? { licenseKey } : {}) },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.employee.update({
      where: { id },
      data: { ...data, syncStatus: 'pending' },
    });
  }

  async remove(id: string) {
    // Soft delete: marquer comme inactif au lieu de supprimer (préserver l'historique)
    return this.prisma.employee.update({
      where: { id },
      data: { status: 'inactive', syncStatus: 'pending' },
    });
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
