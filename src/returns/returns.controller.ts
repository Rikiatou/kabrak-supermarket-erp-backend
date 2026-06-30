import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { ReturnsService } from './returns.service';

@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  create(@Body() dto: any, @Req() req: any) {
    return this.returnsService.create(dto, req.licenseKey, req.employeeId);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.returnsService.findAll(req.licenseKey);
  }

  @Get('stats')
  getStats(@Req() req: any) {
    return this.returnsService.getStats(req.licenseKey);
  }
}
