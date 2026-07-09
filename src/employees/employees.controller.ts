import { Controller, Get, Post, Patch, Delete, Body, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { EmployeesService } from './employees.service';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  findAll(@Req() req: Request & { licenseKey?: string }) {
    return this.employeesService.findAll(true, req.licenseKey);
  }

  @Get('stats')
  getStats() {
    return this.employeesService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Post()
  create(@Body() data: any, @Req() req: Request & { licenseKey?: string }) {
    return this.employeesService.create(data, req.licenseKey);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.employeesService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }
}
