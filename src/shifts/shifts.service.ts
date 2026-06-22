import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async openShift(dto: OpenShiftDto) {
    return this.prisma.shift.create({
      data: {
        registerId: dto.registerId,
        registerName: dto.registerName || null,
        employeeId: dto.employeeId,
        employeeName: dto.employeeName || null,
        openingCash: dto.openingCash,
        status: 'open',
      },
    });
  }

  async closeShift(id: string, dto: CloseShiftDto) {
    const difference = dto.closingCash - dto.expectedCash;

    return this.prisma.shift.update({
      where: { id },
      data: {
        closedAt: new Date(),
        closingCash: dto.closingCash,
        expectedCash: dto.expectedCash,
        difference,
        status: 'closed',
        notes: dto.notes,
      },
    });
  }

  async findActive() {
    return this.prisma.shift.findMany({
      where: { status: 'open' },
      orderBy: { openedAt: 'desc' },
    });
  }

  async findByEmployee(employeeId: string) {
    return this.prisma.shift.findMany({
      where: { employeeId },
      orderBy: { openedAt: 'desc' },
    });
  }

  async findAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [shifts, total] = await Promise.all([
      this.prisma.shift.findMany({
        orderBy: { openedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.shift.count(),
    ]);

    return {
      data: shifts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
