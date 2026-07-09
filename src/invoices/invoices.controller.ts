import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PrismaService } from '../database/prisma.service';

@Controller('invoices')
export class InvoicesController {
  constructor(
    private invoicesService: InvoicesService,
    private prisma: PrismaService,
  ) {}

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

  // Marquer manuellement les factures en retard (appelé par le frontend ou admin)
  @Post('check-overdue')
  async checkOverdue() {
    const now = new Date();
    const result = await this.prisma.invoice.updateMany({
      where: {
        status: { in: ['pending', 'partial', 'sent'] },
        dueDate: { lt: now },
      },
      data: { status: 'overdue' },
    });
    return { success: true, markedOverdue: result.count };
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
  create(@Body() dto: CreateInvoiceDto, @Req() req: any) {
    return this.invoicesService.create(dto, req.user?.id);
  }

  @Post(':id/payments')
  addPayment(@Param('id') id: string, @Body() dto: CreatePaymentDto, @Req() req: any) {
    return this.invoicesService.addPayment(id, dto, req.user?.id);
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
