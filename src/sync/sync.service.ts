import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SyncService implements OnModuleInit {
  private cloudApiUrl: string;
  private cloudApiKey: string;
  private syncEnabled: boolean;
  private isOnline: boolean = true;
  private syncInterval: any;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.cloudApiUrl = this.configService.get<string>('CLOUD_API_URL', '');
    this.cloudApiKey = this.configService.get<string>('CLOUD_API_KEY', '');
    this.syncEnabled = this.configService.get<string>('SYNC_ENABLED') === 'true';
  }

  async onModuleInit() {
    if (this.syncEnabled) {
      // Vérifier connexion toutes les 5 minutes
      const interval = parseInt(
        this.configService.get<string>('SYNC_INTERVAL', '300000'),
      );
      this.syncInterval = setInterval(() => {
        this.checkAndSync();
      }, interval);

      console.log(`🔄 Sync activé - intervalle: ${interval / 1000}s`);
      console.log(`☁️  Cloud API: ${this.cloudApiUrl || 'non configuré'}`);
    } else {
      console.log('🔄 Sync désactivé');
    }
  }

  // Vérifier connexion internet + synchroniser
  async checkAndSync() {
    const wasOnline = this.isOnline;
    this.isOnline = await this.checkInternetConnection();

    if (!wasOnline && this.isOnline) {
      console.log('🌐 Internet restauré - démarrage sync...');
    }

    if (this.isOnline && this.syncEnabled) {
      await this.syncAll();
    }
  }

  // Vérifier connexion internet
  private async checkInternetConnection(): Promise<boolean> {
    if (!this.cloudApiUrl) return false;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.cloudApiUrl}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }

  // Synchroniser tout
  async syncAll() {
    const results = {
      transactions: 0,
      stockMovements: 0,
      shifts: 0,
      invoices: 0,
      returns: 0,
      customers: 0,
      expenses: 0,
      revenues: 0,
      suppliers: 0,
      purchaseOrders: 0,
      schedules: 0,
      loyaltyHistory: 0,
      stores: 0,
      productBatches: 0,
      errors: [] as string[],
    };

    const syncItems: Array<{ name: string; fn: () => Promise<number> }> = [
      { name: 'Transactions', fn: () => this.syncTransactions() },
      { name: 'Stock', fn: () => this.syncStockMovements() },
      { name: 'Shifts', fn: () => this.syncShifts() },
      { name: 'Invoices', fn: () => this.syncInvoices() },
      { name: 'Returns', fn: () => this.syncReturns() },
      { name: 'Customers', fn: () => this.syncCustomers() },
      { name: 'Expenses', fn: () => this.syncExpenses() },
      { name: 'Revenues', fn: () => this.syncRevenues() },
      { name: 'Suppliers', fn: () => this.syncSuppliers() },
      { name: 'PurchaseOrders', fn: () => this.syncPurchaseOrders() },
      { name: 'Schedules', fn: () => this.syncSchedules() },
      { name: 'LoyaltyHistory', fn: () => this.syncLoyaltyHistory() },
      { name: 'Stores', fn: () => this.syncStores() },
      { name: 'ProductBatches', fn: () => this.syncProductBatches() },
    ];

    for (const item of syncItems) {
      try {
        const count = await item.fn();
        (results as any)[item.name.toLowerCase()] = count;
      } catch (e: any) {
        results.errors.push(`${item.name}: ${e.message}`);
      }
    }

    const total = (results.transactions + results.stockMovements + results.shifts + results.invoices +
      results.returns + results.customers + results.expenses + results.revenues +
      results.suppliers + results.purchaseOrders + results.schedules +
      results.loyaltyHistory + results.stores + results.productBatches);
    if (total > 0) {
      console.log(
        `✅ Sync: ${results.transactions} tx, ${results.stockMovements} stock, ${results.shifts} shifts, ${results.invoices} factures, ${results.returns} retours, ${results.customers} clients, ${results.expenses} dépenses, ${results.revenues} recettes, ${results.suppliers} fournisseurs, ${results.purchaseOrders} achats, ${results.schedules} plannings`,
      );
    }

    if (results.errors.length > 0) {
      console.error('❌ Erreurs sync:', results.errors);
    }

    return results;
  }

  // Sync transactions vers cloud
  private async syncTransactions(): Promise<number> {
    const pending = await this.prisma.transaction.findMany({
      where: { syncStatus: 'pending' },
      include: { items: true },
      take: 100, // Batch de 100
    });

    if (pending.length === 0) return 0;

    let synced = 0;
    for (const tx of pending) {
      try {
        const response = await fetch(`${this.cloudApiUrl}/transactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.cloudApiKey,
          },
          body: JSON.stringify(tx),
        });

        if (response.ok) {
          await this.prisma.transaction.update({
            where: { id: tx.id },
            data: {
              syncStatus: 'synced',
              syncedAt: new Date(),
            },
          });
          synced++;
        }
      } catch (e) {
        // Log erreur mais continuer
        await this.prisma.syncLog.create({
          data: {
            entityType: 'transaction',
            entityId: tx.id,
            action: 'create',
            status: 'failed',
            error: e.message,
            attempts: 1,
            lastAttempt: new Date(),
          },
        });
      }
    }

    return synced;
  }

  // Sync mouvements de stock vers cloud
  private async syncStockMovements(): Promise<number> {
    const pending = await this.prisma.stockMovement.findMany({
      where: { syncStatus: 'pending' },
      take: 100,
    });

    if (pending.length === 0) return 0;

    let synced = 0;
    for (const movement of pending) {
      try {
        const response = await fetch(`${this.cloudApiUrl}/stock/movements`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.cloudApiKey,
          },
          body: JSON.stringify(movement),
        });

        if (response.ok) {
          await this.prisma.stockMovement.update({
            where: { id: movement.id },
            data: {
              syncStatus: 'synced',
              syncedAt: new Date(),
            },
          });
          synced++;
        }
      } catch (e) {
        await this.prisma.syncLog.create({
          data: {
            entityType: 'stock_movement',
            entityId: movement.id,
            action: 'create',
            status: 'failed',
            error: e.message,
            attempts: 1,
            lastAttempt: new Date(),
          },
        });
      }
    }

    return synced;
  }

  // Sync shifts vers cloud
  private async syncShifts(): Promise<number> {
    const pending = await this.prisma.shift.findMany({
      where: { syncStatus: 'pending' },
      take: 50,
    }).catch(() => []);

    if (pending.length === 0) return 0;

    let synced = 0;
    for (const shift of pending) {
      try {
        const response = await fetch(`${this.cloudApiUrl}/shifts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.cloudApiKey,
          },
          body: JSON.stringify(shift),
        });

        if (response.ok) {
          await this.prisma.shift.update({
            where: { id: shift.id },
            data: { syncStatus: 'synced', syncedAt: new Date() },
          }).catch(() => {});
          synced++;
        }
      } catch (e) {
        // ignore
      }
    }
    return synced;
  }

  // Sync invoices vers cloud (avec items + payments)
  private async syncInvoices(): Promise<number> {
    const pending = await this.prisma.invoice.findMany({
      where: { syncStatus: 'pending' },
      include: { items: true, payments: true },
      take: 50,
    }).catch(() => []);

    if (pending.length === 0) return 0;

    let synced = 0;
    for (const inv of pending) {
      try {
        const response = await fetch(`${this.cloudApiUrl}/invoices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.cloudApiKey,
          },
          body: JSON.stringify(inv),
        });

        if (response.ok) {
          await this.prisma.invoice.update({
            where: { id: inv.id },
            data: { syncStatus: 'synced', syncedAt: new Date() },
          }).catch(() => {});
          synced++;
        }
      } catch (e) {
        // ignore
      }
    }
    return synced;
  }

  // Sync returns vers cloud (avec items)
  private async syncReturns(): Promise<number> {
    const pending = await this.prisma.productReturn.findMany({
      where: { syncStatus: 'pending' },
      include: { items: true },
      take: 50,
    }).catch(() => []);

    if (pending.length === 0) return 0;

    let synced = 0;
    for (const ret of pending) {
      try {
        const response = await fetch(`${this.cloudApiUrl}/returns`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.cloudApiKey,
          },
          body: JSON.stringify(ret),
        });

        if (response.ok) {
          await this.prisma.productReturn.update({
            where: { id: ret.id },
            data: { syncStatus: 'synced', syncedAt: new Date() },
          }).catch(() => {});
          synced++;
        }
      } catch (e) {
        // ignore
      }
    }
    return synced;
  }

  // Sync customers vers cloud
  private async syncCustomers(): Promise<number> {
    const pending = await this.prisma.customer.findMany({
      where: { syncStatus: 'pending' },
      take: 50,
    }).catch(() => []);

    if (pending.length === 0) return 0;

    let synced = 0;
    for (const cust of pending) {
      try {
        const response = await fetch(`${this.cloudApiUrl}/customers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.cloudApiKey,
          },
          body: JSON.stringify(cust),
        });

        if (response.ok) {
          await this.prisma.customer.update({
            where: { id: cust.id },
            data: { syncStatus: 'synced', syncedAt: new Date() },
          }).catch(() => {});
          synced++;
        }
      } catch (e) {
        // ignore
      }
    }
    return synced;
  }

  // Sync expenses vers cloud
  private async syncExpenses(): Promise<number> {
    const pending = await this.prisma.expense.findMany({
      where: { syncStatus: 'pending' },
      take: 50,
    }).catch(() => []);

    if (pending.length === 0) return 0;

    let synced = 0;
    for (const exp of pending) {
      try {
        const response = await fetch(`${this.cloudApiUrl}/accounting/expenses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': this.cloudApiKey },
          body: JSON.stringify(exp),
        });
        if (response.ok) {
          await this.prisma.expense.update({
            where: { id: exp.id },
            data: { syncStatus: 'synced', syncedAt: new Date() },
          }).catch(() => {});
          synced++;
        }
      } catch (e) { /* ignore */ }
    }
    return synced;
  }

  // Sync revenues vers cloud
  private async syncRevenues(): Promise<number> {
    const pending = await this.prisma.revenue.findMany({
      where: { syncStatus: 'pending' },
      take: 50,
    }).catch(() => []);

    if (pending.length === 0) return 0;

    let synced = 0;
    for (const rev of pending) {
      try {
        const response = await fetch(`${this.cloudApiUrl}/accounting/revenues`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': this.cloudApiKey },
          body: JSON.stringify(rev),
        });
        if (response.ok) {
          await this.prisma.revenue.update({
            where: { id: rev.id },
            data: { syncStatus: 'synced', syncedAt: new Date() },
          }).catch(() => {});
          synced++;
        }
      } catch (e) { /* ignore */ }
    }
    return synced;
  }

  // Sync suppliers vers cloud
  private async syncSuppliers(): Promise<number> {
    const pending = await this.prisma.supplier.findMany({
      where: { syncStatus: 'pending' },
      take: 50,
    }).catch(() => []);

    if (pending.length === 0) return 0;

    let synced = 0;
    for (const sup of pending) {
      try {
        const response = await fetch(`${this.cloudApiUrl}/suppliers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': this.cloudApiKey },
          body: JSON.stringify(sup),
        });
        if (response.ok) {
          await this.prisma.supplier.update({
            where: { id: sup.id },
            data: { syncStatus: 'synced', syncedAt: new Date() },
          }).catch(() => {});
          synced++;
        }
      } catch (e) { /* ignore */ }
    }
    return synced;
  }

  // Sync purchase orders vers cloud (avec items)
  private async syncPurchaseOrders(): Promise<number> {
    const pending = await this.prisma.purchaseOrder.findMany({
      where: { syncStatus: 'pending' },
      include: { items: true },
      take: 50,
    }).catch(() => []);

    if (pending.length === 0) return 0;

    let synced = 0;
    for (const po of pending) {
      try {
        const response = await fetch(`${this.cloudApiUrl}/purchase-orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': this.cloudApiKey },
          body: JSON.stringify(po),
        });
        if (response.ok) {
          await this.prisma.purchaseOrder.update({
            where: { id: po.id },
            data: { syncStatus: 'synced', syncedAt: new Date() },
          }).catch(() => {});
          synced++;
        }
      } catch (e) { /* ignore */ }
    }
    return synced;
  }

  // Sync schedules vers cloud
  private async syncSchedules(): Promise<number> {
    const pending = await this.prisma.schedule.findMany({
      where: { syncStatus: 'pending' },
      take: 50,
    }).catch(() => []);

    if (pending.length === 0) return 0;

    let synced = 0;
    for (const sch of pending) {
      try {
        const response = await fetch(`${this.cloudApiUrl}/schedules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': this.cloudApiKey },
          body: JSON.stringify(sch),
        });
        if (response.ok) {
          await this.prisma.schedule.update({
            where: { id: sch.id },
            data: { syncStatus: 'synced', syncedAt: new Date() },
          }).catch(() => {});
          synced++;
        }
      } catch (e) { /* ignore */ }
    }
    return synced;
  }

  // Sync loyalty history vers cloud
  private async syncLoyaltyHistory(): Promise<number> {
    const pending = await this.prisma.loyaltyHistory.findMany({
      where: { syncStatus: 'pending' },
      take: 50,
    }).catch(() => []);

    if (pending.length === 0) return 0;

    let synced = 0;
    for (const lh of pending) {
      try {
        const response = await fetch(`${this.cloudApiUrl}/customers/${lh.customerId}/loyalty`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': this.cloudApiKey },
          body: JSON.stringify(lh),
        });
        if (response.ok) {
          await this.prisma.loyaltyHistory.update({
            where: { id: lh.id },
            data: { syncStatus: 'synced', syncedAt: new Date() },
          }).catch(() => {});
          synced++;
        }
      } catch (e) { /* ignore */ }
    }
    return synced;
  }

  // Sync stores vers cloud
  private async syncStores(): Promise<number> {
    const pending = await this.prisma.store.findMany({
      where: { syncStatus: 'pending' },
      take: 50,
    }).catch(() => []);

    if (pending.length === 0) return 0;

    let synced = 0;
    for (const store of pending) {
      try {
        const response = await fetch(`${this.cloudApiUrl}/licenses/${store.licenseId}/stores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': this.cloudApiKey },
          body: JSON.stringify(store),
        });
        if (response.ok) {
          await this.prisma.store.update({
            where: { id: store.id },
            data: { syncStatus: 'synced', syncedAt: new Date() },
          }).catch(() => {});
          synced++;
        }
      } catch (e) { /* ignore */ }
    }
    return synced;
  }

  // Sync product batches vers cloud
  private async syncProductBatches(): Promise<number> {
    const pending = await this.prisma.productBatch.findMany({
      where: { syncStatus: 'pending' },
      take: 50,
    }).catch(() => []);

    if (pending.length === 0) return 0;

    let synced = 0;
    for (const batch of pending) {
      try {
        const response = await fetch(`${this.cloudApiUrl}/batches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': this.cloudApiKey },
          body: JSON.stringify(batch),
        });
        if (response.ok) {
          await this.prisma.productBatch.update({
            where: { id: batch.id },
            data: { syncStatus: 'synced', syncedAt: new Date() },
          }).catch(() => {});
          synced++;
        }
      } catch (e) { /* ignore */ }
    }
    return synced;
  }

  // Statut sync
  async getStatus() {
    const [
      pendingTx, pendingMovements, pendingShifts, pendingInvoices,
      pendingReturns, pendingCustomers, pendingExpenses, pendingRevenues,
      pendingSuppliers, pendingPurchaseOrders, pendingSchedules,
      pendingLoyalty, pendingStores, pendingBatches, failedLogs
    ] = await Promise.all([
      this.prisma.transaction.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.prisma.stockMovement.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.prisma.shift.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.prisma.invoice.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.prisma.productReturn.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.prisma.customer.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.prisma.expense.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.prisma.revenue.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.prisma.supplier.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.prisma.purchaseOrder.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.prisma.schedule.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.prisma.loyaltyHistory.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.prisma.store.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.prisma.productBatch.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.prisma.syncLog.count({ where: { status: 'failed' } }).catch(() => 0),
    ]);

    const total = pendingTx + pendingMovements + pendingShifts + pendingInvoices +
      pendingReturns + pendingCustomers + pendingExpenses + pendingRevenues +
      pendingSuppliers + pendingPurchaseOrders + pendingSchedules +
      pendingLoyalty + pendingStores + pendingBatches;

    return {
      enabled: this.syncEnabled,
      online: this.isOnline,
      cloudApiUrl: this.cloudApiUrl || 'non configuré',
      pending: {
        transactions: pendingTx,
        stockMovements: pendingMovements,
        shifts: pendingShifts,
        invoices: pendingInvoices,
        returns: pendingReturns,
        customers: pendingCustomers,
        expenses: pendingExpenses,
        revenues: pendingRevenues,
        suppliers: pendingSuppliers,
        purchaseOrders: pendingPurchaseOrders,
        schedules: pendingSchedules,
        loyaltyHistory: pendingLoyalty,
        stores: pendingStores,
        productBatches: pendingBatches,
        total,
      },
      failed: failedLogs,
      lastSync: new Date().toISOString(),
    };
  }

  // Forcer sync manuel
  async forceSync() {
    return this.syncAll();
  }
}
