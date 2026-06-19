import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { StockService } from './stock.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('movements')
  createMovement(@Body() dto: CreateStockMovementDto) {
    return this.stockService.createMovement(dto);
  }

  @Get('movements')
  findAllMovements(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('productId') productId?: string,
  ) {
    return this.stockService.findAllMovements(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      productId,
    );
  }

  @Get('alerts')
  getAlerts() {
    return this.stockService.getAlerts();
  }

  @Get('value')
  getStockValue() {
    return this.stockService.getStockValue();
  }

  @Get('pending-sync')
  findPendingSync() {
    return this.stockService.findPendingSync();
  }

  @Post('movements/:id/synced')
  markAsSynced(@Param('id') id: string) {
    return this.stockService.markAsSynced(id);
  }

  @Post('adjust/:productId')
  adjustInventory(
    @Param('productId') productId: string,
    @Body('newStock') newStock: number,
    @Body('reason') reason: string,
    @Body('createdBy') createdBy?: string,
  ) {
    return this.stockService.adjustInventory(productId, newStock, reason, createdBy);
  }
}
