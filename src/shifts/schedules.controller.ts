import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/create-schedule.dto';

@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  // Liste complète (groupée par jour)
  @Get()
  findAll() {
    return this.schedulesService.findAll();
  }

  // Planning d'aujourd'hui (qui est censé être où maintenant)
  @Get('today')
  getToday() {
    return this.schedulesService.getTodaySchedule();
  }

  // Liste de toutes les caisses (pour le frontend)
  @Get('registers')
  getRegisters() {
    return this.schedulesService.getRegisters();
  }

  // Planning d'un employé
  @Get('employee/:employeeId')
  findByEmployee(@Param('employeeId') employeeId: string) {
    return this.schedulesService.findByEmployee(employeeId);
  }

  // Planning d'une caisse
  @Get('register/:registerId')
  findByRegister(@Param('registerId') registerId: string) {
    return this.schedulesService.findByRegister(registerId);
  }

  // Créer un créneau
  @Post()
  create(@Body() dto: CreateScheduleDto) {
    return this.schedulesService.create(dto);
  }

  // Dupliquer un créneau vers un autre jour
  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @Body('targetDayOfWeek') targetDayOfWeek: number) {
    return this.schedulesService.duplicateSchedule(id, targetDayOfWeek);
  }

  // Modifier un créneau
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.schedulesService.update(id, dto);
  }

  // Supprimer un créneau
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.schedulesService.remove(id);
  }
}
