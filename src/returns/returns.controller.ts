import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { ReturnsService } from './returns.service';

@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  create(@Body() dto: any, @Req() req: any) {
    // createdBy: priorité au body (envoyé par le frontend), sinon req.user (auth guard)
    const createdBy = dto?.createdBy || req.user?.id || req.employeeId;
    return this.returnsService.create(dto, req.licenseKey, createdBy);
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
