import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  getSalesReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getSalesReport(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('sales/by-category')
  getSalesByCategory(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getSalesByCategory(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('sales/by-employee')
  getSalesByEmployee(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getSalesByEmployee(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('products/top')
  getTopProducts(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getTopProducts(
      new Date(startDate),
      new Date(endDate),
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('products/worst')
  getWorstProducts(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getWorstProducts(
      new Date(startDate),
      new Date(endDate),
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('profit')
  getProfitAnalysis(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getProfitAnalysis(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('sales/by-day')
  getSalesByDay(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getSalesByDay(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('sales/by-month')
  getSalesByMonth(@Query('year') year: string) {
    return this.reportsService.getSalesByMonth(parseInt(year, 10));
  }

  @Get('inventory/valuation')
  getInventoryValuation() {
    return this.reportsService.getInventoryValuation();
  }
}
