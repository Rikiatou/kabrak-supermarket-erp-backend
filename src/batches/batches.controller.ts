import { Controller, Get, Post, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { BatchesService } from './batches.service';

@Controller('api/batches')
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  // GET /api/batches?productId=xxx — lots d'un produit
  // GET /api/batches?expiring=true — lots expirant bientôt
  @Get()
  findAll(@Query('productId') productId?: string, @Query('expiring') expiring?: string, @Req() req?: any) {
    if (productId) return this.batchesService.findByProduct(productId);
    return this.batchesService.findAll(req?.licenseKey, expiring === 'true');
  }

  // GET /api/batches/expiry-alerts — alertes d'expiration par lot
  @Get('expiry-alerts')
  expiryAlerts(@Req() req: any) {
    return this.batchesService.expiryAlerts(req.licenseKey);
  }

  // POST /api/batches — créer un lot
  @Post()
  create(@Body() dto: any, @Req() req: any) {
    return this.batchesService.create({
      ...dto,
      licenseKey: req.licenseKey,
    });
  }

  // DELETE /api/batches/:id — supprimer un lot
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.batchesService.remove(id);
  }
}
