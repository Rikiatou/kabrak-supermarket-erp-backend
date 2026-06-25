import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/create-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService) {}

  // Créer un créneau de planning
  async create(dto: CreateScheduleDto) {
    // Vérifier que l'employé existe et est actif
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });
    if (!employee) {
      throw new NotFoundException(`Employé #${dto.employeeId} non trouvé`);
    }
    if (employee.status === 'inactive') {
      throw new BadRequestException(
        `Cet employé est inactif et ne peut pas être assigné (statut: ${employee.status})`,
      );
    }

    // NOTE: registerId is now a plain string (e.g. "reg1") — no FK check needed

    // Vérifier que startTime < endTime
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException(
        `L'heure de début (${dto.startTime}) doit être avant l'heure de fin (${dto.endTime})`,
      );
    }

    // Vérifier l'unicité (employé × jour × startTime)
    const existing = await this.prisma.schedule.findUnique({
      where: {
        employeeId_dayOfWeek_startTime: {
          employeeId: dto.employeeId,
          dayOfWeek: dto.dayOfWeek,
          startTime: dto.startTime,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `Cet employé a déjà un créneau le jour ${dto.dayOfWeek} à ${dto.startTime}`,
      );
    }

    return this.prisma.schedule.create({
      data: dto,
      include: {
        employee: true,
              },
    });
  }

  // Liste complète (tous les créneaux)
  async findAll() {
    const schedules = await this.prisma.schedule.findMany({
      where: { isActive: true },
      include: {
        employee: true,
              },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    // Grouper par jour pour faciliter l'affichage frontend
    const byDay: Record<number, typeof schedules> = {};
    for (let i = 0; i <= 6; i++) {
      byDay[i] = [];
    }
    schedules.forEach((s) => {
      byDay[s.dayOfWeek].push(s);
    });

    return {
      all: schedules,
      byDay,
      total: schedules.length,
    };
  }

  // Planning d'un employé spécifique
  async findByEmployee(employeeId: string) {
    return this.prisma.schedule.findMany({
      where: { employeeId, isActive: true },
      include: { employee: true },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  // Planning d'une caisse spécifique
  async findByRegister(registerId: string) {
    return this.prisma.schedule.findMany({
      where: { registerId, isActive: true },
      include: { employee: true },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  // Qui est censé être à quelle caisse aujourd'hui ?
  async getTodaySchedule() {
    const today = new Date().getDay(); // 0=dimanche, 6=samedi
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const todaySchedules = await this.prisma.schedule.findMany({
      where: {
        dayOfWeek: today,
        isActive: true,
        startTime: { lte: currentTime },
        endTime: { gt: currentTime },
      },
      include: {
        employee: true,
              },
      orderBy: { startTime: 'asc' },
    });

    return {
      dayOfWeek: today,
      currentTime,
      active: todaySchedules,
    };
  }

  // Modifier un créneau
  async update(id: string, dto: UpdateScheduleDto) {
    const schedule = await this.prisma.schedule.findUnique({ where: { id } });
    if (!schedule) {
      throw new NotFoundException(`Créneau #${id} non trouvé`);
    }

    if (dto.startTime && dto.endTime && dto.startTime >= dto.endTime) {
      throw new BadRequestException('startTime doit être avant endTime');
    }

    return this.prisma.schedule.update({
      where: { id },
      data: dto,
      include: {
        employee: true,
              },
    });
  }

  // Supprimer un créneau
  async remove(id: string) {
    const schedule = await this.prisma.schedule.findUnique({ where: { id } });
    if (!schedule) {
      throw new NotFoundException(`Créneau #${id} non trouvé`);
    }

    return this.prisma.schedule.delete({
      where: { id },
    });
  }

  // Copier le planning d'une semaine à l'autre (pas nécessaire car récurrent, mais utile pour dupliquer)
  async duplicateSchedule(scheduleId: string, targetDayOfWeek: number) {
    const original = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
    });
    if (!original) {
      throw new NotFoundException(`Créneau #${scheduleId} non trouvé`);
    }

    // Vérifier l'unicité
    const existing = await this.prisma.schedule.findUnique({
      where: {
        employeeId_dayOfWeek_startTime: {
          employeeId: original.employeeId,
          dayOfWeek: targetDayOfWeek,
          startTime: original.startTime,
        },
      },
    });
    if (existing) {
      throw new ConflictException('Un créneau identique existe déjà pour ce jour');
    }

    return this.prisma.schedule.create({
      data: {
        employeeId: original.employeeId,
        registerId: original.registerId,
        dayOfWeek: targetDayOfWeek,
        startTime: original.startTime,
        endTime: original.endTime,
        breakStart: original.breakStart,
        breakEnd: original.breakEnd,
        notes: original.notes,
      },
      include: {
        employee: true,
              },
    });
  }
}
