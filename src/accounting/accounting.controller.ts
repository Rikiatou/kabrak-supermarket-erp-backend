import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateRevenueDto } from './dto/create-revenue.dto';

@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  // "2026-11-26" = journée locale entière (sinon new Date() donne minuit UTC
  // et la date de fin excluait les ventes du jour même).
  private parseDay(value: string, endOfDay: boolean): Date {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!m) return new Date(value);
    const [y, mo, d] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
    return endOfDay ? new Date(y, mo, d, 23, 59, 59, 999) : new Date(y, mo, d);
  }

  private parseDates(startDate?: string, endDate?: string) {
    const end = endDate ? this.parseDay(endDate, true) : new Date();
    const start = startDate
      ? this.parseDay(startDate, false)
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
