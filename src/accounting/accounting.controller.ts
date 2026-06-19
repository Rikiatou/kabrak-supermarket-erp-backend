import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateRevenueDto } from './dto/create-revenue.dto';

@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('expenses')
  getExpenses(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('category') category?: string,
  ) {
    return this.accountingService.getExpenses(
      new Date(startDate),
      new Date(endDate),
      category,
    );
  }

  @Post('expenses')
  createExpense(@Body() dto: CreateExpenseDto) {
    return this.accountingService.createExpense(dto);
  }

  @Get('revenues')
  getRevenues(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('category') category?: string,
  ) {
    return this.accountingService.getRevenues(
      new Date(startDate),
      new Date(endDate),
      category,
    );
  }

  @Post('revenues')
  createRevenue(@Body() dto: CreateRevenueDto) {
    return this.accountingService.createRevenue(dto);
  }

  @Get('profit-loss')
  getProfitAndLoss(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.accountingService.getProfitAndLoss(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('monthly-summary')
  getMonthlySummary(@Query('year') year: string) {
    return this.accountingService.getMonthlySummary(parseInt(year, 10));
  }

  @Get('expense-breakdown')
  getExpenseBreakdown(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.accountingService.getExpenseBreakdown(
      new Date(startDate),
      new Date(endDate),
    );
  }
}
