import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';

@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.shiftsService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('active')
  findActive() {
    return this.shiftsService.findActive();
  }

  @Get('employee/:employeeId')
  findByEmployee(@Param('employeeId') employeeId: string) {
    return this.shiftsService.findByEmployee(employeeId);
  }

  @Get('daily-z-report')
  getDailyZReport(@Query('employeeId') employeeId: string, @Query('date') date: string) {
    if (!employeeId || !date) {
      throw new BadRequestException('employeeId and date are required');
    }
    return this.shiftsService.getDailyZReport(employeeId, date);
  }

  @Get(':id/z-report')
  getZReport(@Param('id') id: string) {
    return this.shiftsService.getZReport(id);
  }

  @Post('open')
  openShift(@Body() dto: OpenShiftDto) {
    return this.shiftsService.openShift(dto);
  }

  @Post(':id/close')
  closeShift(@Param('id') id: string, @Body() dto: CloseShiftDto) {
    return this.shiftsService.closeShift(id, dto);
  }
}
