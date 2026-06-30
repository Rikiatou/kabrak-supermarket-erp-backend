import { Controller, Get, Post, Patch, Body, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  findAll(@Req() req: Request & { licenseKey?: string }) {
    return this.suppliersService.findAll(true, req.licenseKey);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Post()
  create(@Body() data: any, @Req() req: Request & { licenseKey?: string }) {
    return this.suppliersService.create(data, req.licenseKey);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.suppliersService.update(id, data);
  }

  @Post(':id/deactivate')
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}
