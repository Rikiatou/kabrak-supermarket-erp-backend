import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // Helper: parse query dates with sensible defaults
  private parseDates(startDate?: string, endDate?: string) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
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
