import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/auth.guard';
import { ProductsModule } from './products/products.module';
import { TransactionsModule } from './transactions/transactions.module';
import { StockModule } from './stock/stock.module';
import { ImportModule } from './import/import.module';
import { SyncModule } from './sync/sync.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { EmployeesModule } from './employees/employees.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { ShiftsModule } from './shifts/shifts.module';
import { CustomersModule } from './customers/customers.module';
import { ReportsModule } from './reports/reports.module';
import { AccountingModule } from './accounting/accounting.module';
import { AiModule } from './ai/ai.module';
import { InvoicesModule } from './invoices/invoices.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CronModule } from './cron/cron.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.local',
    }),

    // Modules
    DatabaseModule,
    AuthModule,
    ProductsModule,
    TransactionsModule,
    StockModule,
    ImportModule,
    SyncModule,
    SuppliersModule,
    EmployeesModule,
    PurchaseOrdersModule,
    ShiftsModule,
    CustomersModule,
    ReportsModule,
    AccountingModule,
    AiModule,
    InvoicesModule,
    NotificationsModule,
    CronModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Guard global — toutes les routes nécessitent un token sauf @Public()
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
