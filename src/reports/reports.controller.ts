import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // Helper: parse query dates with sensible defaults
  // "YYYY-MM-DD" = whole local day (new Date('2026-11-26') is UTC midnight and dropped that day's sales)
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
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1); // 1st of current month
    return { start, end };
  }

  @Get('sales')
  getSalesReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.reportsService.getSalesReport(start, end);
  }

  @Get('sales/by-category')
  getSalesByCategory(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.reportsService.getSalesByCategory(start, end);
  }

  @Get('sales/by-employee')
  getSalesByEmployee(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.reportsService.getSalesByEmployee(start, end);
  }

  @Get('products/top')
  getTopProducts(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit?: string,
  ) {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.reportsService.getTopProducts(
      start,
      end,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('products/worst')
  getWorstProducts(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit?: string,
  ) {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.reportsService.getWorstProducts(
      start,
      end,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('profit')
  getProfitAnalysis(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.reportsService.getProfitAnalysis(start, end);
  }

  @Get('sales/by-day')
  getSalesByDay(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.reportsService.getSalesByDay(start, end);
  }

  @Get('sales/by-month')
  getSalesByMonth(@Query('year') year: string) {
    return this.reportsService.getSalesByMonth(
      year ? parseInt(year, 10) : new Date().getFullYear(),
    );
  }

  @Get('inventory/valuation')
  getInventoryValuation() {
    return this.reportsService.getInventoryValuation();
  }

  @Get('discounts')
  getDiscountsReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const { start, end } = this.parseDates(startDate, endDate);
    return this.reportsService.getDiscountsReport(start, end);
  }
}
