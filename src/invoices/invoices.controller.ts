import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.invoicesService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      status,
    );
  }

  @Get('stats')
  getStats() {
    return this.invoicesService.getStats();
  }

  @Get('stats/unpaid')
  getUnpaidStats() {
    return this.invoicesService.getUnpaidStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Get(':id/payments')
  getPayments(@Param('id') id: string) {
    return this.invoicesService.getPayments(id);
  }

  @Post()
  create(@Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(dto);
  }

  @Post(':id/payments')
  addPayment(@Param('id') id: string, @Body() dto: CreatePaymentDto) {
    return this.invoicesService.addPayment(id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; paymentMethod?: string },
  ) {
    return this.invoicesService.updateStatus(id, body.status, body.paymentMethod);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.invoicesService.remove(id);
  }
}
