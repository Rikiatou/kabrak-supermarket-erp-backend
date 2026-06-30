import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(
    @Body() createTransactionDto: CreateTransactionDto,
    @Req() req: Request & { licenseKey?: string },
  ) {
    return this.transactionsService.create(createTransactionDto, req.licenseKey);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('cashierId') cashierId?: string,
    @Req() req?: Request & { licenseKey?: string },
  ) {
    return this.transactionsService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      cashierId,
      req?.licenseKey,
    );
  }

  @Get('stats/today')
  getTodayStats(@Req() req: Request & { licenseKey?: string }) {
    return this.transactionsService.getTodayStats(req.licenseKey);
  }

  @Get('stats/yesterday')
  getYesterdayStats(@Req() req: Request & { licenseKey?: string }) {
    return this.transactionsService.getYesterdayStats(req.licenseKey);
  }

  @Get('stats/week-trend')
  getWeekTrend(@Req() req: Request & { licenseKey?: string }) {
    return this.transactionsService.getWeekTrend(req.licenseKey);
  }

  @Get('stats/by-register')
  getSalesByRegister() {
    return this.transactionsService.getSalesByRegister();
  }

  @Get('stats/by-hour')
  getSalesByHour(@Req() req: Request & { licenseKey?: string }) {
    return this.transactionsService.getSalesByHour(req.licenseKey);
  }

  @Get('stats/margin-by-category')
  getMarginByCategory() {
    return this.transactionsService.getMarginByCategory();
  }

  @Get('stats/monthly-goal')
  getMonthlyGoal(@Req() req: Request & { licenseKey?: string }) {
    return this.transactionsService.getMonthlyGoal(req.licenseKey);
  }

  @Get('stats/top-products')
  getTopProducts(
    @Query('limit') limit?: string,
    @Req() req?: Request & { licenseKey?: string },
  ) {
    return this.transactionsService.getTopProducts(
      limit ? parseInt(limit) : 5,
      req?.licenseKey,
    );
  }

  @Get('stats/average-basket')
  getAverageBasket(@Req() req: Request & { licenseKey?: string }) {
    return this.transactionsService.getAverageBasket(req.licenseKey);
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
