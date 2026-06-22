import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateRevenueDto } from './dto/create-revenue.dto';

@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  private parseDates(startDate?: string, endDate?: string) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return { start, end };
  }

  @Get('expenses')
  getExpenses(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('category') category?: string,
  ) {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.accountingService.getExpenses(start, end, category);
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
    const { start, end } = this.parseDates(startDate, endDate);
    return this.accountingService.getRevenues(start, end, category);
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
    const { start, end } = this.parseDates(startDate, endDate);
    return this.accountingService.getProfitAndLoss(start, end);
  }

  @Get('monthly-summary')
  getMonthlySummary(@Query('year') year: string) {
    return this.accountingService.getMonthlySummary(
      year ? parseInt(year, 10) : new Date().getFullYear(),
    );
  }

  @Get('expense-breakdown')
  getExpenseBreakdown(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.accountingService.getExpenseBreakdown(start, end);
  }
}
