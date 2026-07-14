import {
  Controller,
  Post,
  Body,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/public.decorator';
import { CloudSyncService } from './cloud-sync.service';

// Controller exécuté sur le CLOUD pour recevoir les données sync depuis le local
// Toutes les routes vérifient le x-api-key header (pas JWT)
@Controller('cloud-sync')
@Public()
export class CloudSyncController {
  private apiKey: string;

  constructor(
    private cloudSyncService: CloudSyncService,
    private configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('CLOUD_API_KEY', '');
  }

  private verifyApiKey(headers: Record<string, string>) {
    const key = headers['x-api-key'];
    if (!this.apiKey || key !== this.apiKey) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
  }

  @Post('products')
  upsertProduct(@Body() body: any, @Headers() headers: Record<string, string>) {
    this.verifyApiKey(headers);
    return this.cloudSyncService.upsertProduct(body);
  }

  @Post('employees')
  upsertEmployee(@Body() body: any, @Headers() headers: Record<string, string>) {
    this.verifyApiKey(headers);
    return this.cloudSyncService.upsertEmployee(body);
  }

  @Post('cash-registers')
  upsertCashRegister(@Body() body: any, @Headers() headers: Record<string, string>) {
    this.verifyApiKey(headers);
    return this.cloudSyncService.upsertCashRegister(body);
  }

  @Post('transactions')
  upsertTransaction(@Body() body: any, @Headers() headers: Record<string, string>) {
    this.verifyApiKey(headers);
    return this.cloudSyncService.upsertTransaction(body);
  }

  @Post('suppliers')
  upsertSupplier(@Body() body: any, @Headers() headers: Record<string, string>) {
    this.verifyApiKey(headers);
    return this.cloudSyncService.upsertSupplier(body);
  }

  @Post('purchase-orders')
  upsertPurchaseOrder(@Body() body: any, @Headers() headers: Record<string, string>) {
    this.verifyApiKey(headers);
    return this.cloudSyncService.upsertPurchaseOrder(body);
  }

  @Post('customers')
  upsertCustomer(@Body() body: any, @Headers() headers: Record<string, string>) {
    this.verifyApiKey(headers);
    return this.cloudSyncService.upsertCustomer(body);
  }

  @Post('expenses')
  upsertExpense(@Body() body: any, @Headers() headers: Record<string, string>) {
    this.verifyApiKey(headers);
    return this.cloudSyncService.upsertExpense(body);
  }

  @Post('revenues')
  upsertRevenue(@Body() body: any, @Headers() headers: Record<string, string>) {
    this.verifyApiKey(headers);
    return this.cloudSyncService.upsertRevenue(body);
  }

  @Post('shifts')
  upsertShift(@Body() body: any, @Headers() headers: Record<string, string>) {
    this.verifyApiKey(headers);
    return this.cloudSyncService.upsertShift(body);
  }

  @Post('invoices')
  upsertInvoice(@Body() body: any, @Headers() headers: Record<string, string>) {
    this.verifyApiKey(headers);
    return this.cloudSyncService.upsertInvoice(body);
  }

  @Post('returns')
  upsertReturn(@Body() body: any, @Headers() headers: Record<string, string>) {
    this.verifyApiKey(headers);
    return this.cloudSyncService.upsertReturn(body);
  }

  @Post('schedules')
  upsertSchedule(@Body() body: any, @Headers() headers: Record<string, string>) {
    this.verifyApiKey(headers);
    return this.cloudSyncService.upsertSchedule(body);
  }

  @Post('loyalty-history')
  upsertLoyaltyHistory(@Body() body: any, @Headers() headers: Record<string, string>) {
    this.verifyApiKey(headers);
    return this.cloudSyncService.upsertLoyaltyHistory(body);
  }

  @Post('stores')
  upsertStore(@Body() body: any, @Headers() headers: Record<string, string>) {
    this.verifyApiKey(headers);
    return this.cloudSyncService.upsertStore(body);
  }

  @Post('product-batches')
  upsertProductBatch(@Body() body: any, @Headers() headers: Record<string, string>) {
    this.verifyApiKey(headers);
    return this.cloudSyncService.upsertProductBatch(body);
  }

  @Post('stock-movements')
  upsertStockMovement(@Body() body: any, @Headers() headers: Record<string, string>) {
    this.verifyApiKey(headers);
    return this.cloudSyncService.upsertStockMovement(body);
  }
}
