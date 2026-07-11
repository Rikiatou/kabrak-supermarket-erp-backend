import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@Body() createTransactionDto: CreateTransactionDto) {
    return this.transactionsService.create(createTransactionDto);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('cashierId') cashierId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.transactionsService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      cashierId,
      startDate,
      endDate,
    );
  }

  @Get('stats/today')
  getTodayStats() {
    return this.transactionsService.getTodayStats();
  }

  @Get('stats/yesterday')
  getYesterdayStats() {
    return this.transactionsService.getYesterdayStats();
  }

  @Get('stats/week-trend')
  getWeekTrend() {
    return this.transactionsService.getWeekTrend();
  }

  @Get('stats/by-register')
  getSalesByRegister() {
    return this.transactionsService.getSalesByRegister();
  }

  @Get('stats/by-hour')
  getSalesByHour() {
    return this.transactionsService.getSalesByHour();
  }

  @Get('stats/margin-by-category')
  getMarginByCategory() {
    return this.transactionsService.getMarginByCategory();
  }

  @Get('stats/monthly-goal')
  getMonthlyGoal() {
    return this.transactionsService.getMonthlyGoal();
  }

  @Get('stats/top-products')
  getTopProducts(@Query('limit') limit?: string) {
    return this.transactionsService.getTopProducts(limit ? parseInt(limit) : 5);
  }

  @Get('stats/average-basket')
  getAverageBasket() {
    return this.transactionsService.getAverageBasket();
  }

  @Get('pending-sync')
  findPendingSync() {
    return this.transactionsService.findPendingSync();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @Post(':id/refund')
  refund(@Param('id') id: string, @Body('reason') reason: string) {
    return this.transactionsService.refund(id, reason);
  }

  @Post(':id/synced')
  markAsSynced(@Param('id') id: string) {
    return this.transactionsService.markAsSynced(id);
  }
}
