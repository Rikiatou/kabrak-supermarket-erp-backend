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
      errors: [] as string[],
    };

    try {
      // 1. Sync transactions
      results.transactions = await this.syncTransactions();
    } catch (e) {
      results.errors.push(`Transactions: ${e.message}`);
    }

    try {
      // 2. Sync stock movements
      results.stockMovements = await this.syncStockMovements();
    } catch (e) {
      results.errors.push(`Stock: ${e.message}`);
    }

    try {
      // 3. Sync shifts
      results.shifts = await this.syncShifts();
    } catch (e) {
      results.errors.push(`Shifts: ${e.message}`);
    }

    try {
      // 4. Sync invoices
      results.invoices = await this.syncInvoices();
    } catch (e) {
      results.errors.push(`Invoices: ${e.message}`);
    }

    try {
      // 5. Sync returns
      results.returns = await this.syncReturns();
    } catch (e) {
      results.errors.push(`Returns: ${e.message}`);
    }

    try {
      // 6. Sync customers
      results.customers = await this.syncCustomers();
    } catch (e) {
      results.errors.push(`Customers: ${e.message}`);
    }

    const total = results.transactions + results.stockMovements + results.shifts + results.invoices + results.returns + results.customers;
    if (total > 0) {
      console.log(
        `✅ Sync: ${results.transactions} tx, ${results.stockMovements} stock, ${results.shifts} shifts, ${results.invoices} factures, ${results.returns} retours, ${results.customers} clients`,
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

  // Sync invoices vers cloud
  private async syncInvoices(): Promise<number> {
    const pending = await this.prisma.invoice.findMany({
      where: { syncStatus: 'pending' },
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

  // Sync returns vers cloud
  private async syncReturns(): Promise<number> {
    const pending = await this.prisma.productReturn.findMany({
      where: { syncStatus: 'pending' },
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

  // Statut sync
  async getStatus() {
    const [pendingTx, pendingMovements, pendingShifts, pendingInvoices, pendingReturns, pendingCustomers, failedLogs] = await Promise.all([
      this.prisma.transaction.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.prisma.stockMovement.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.prisma.shift.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.prisma.invoice.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.prisma.productReturn.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.prisma.customer.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.prisma.syncLog.count({ where: { status: 'failed' } }).catch(() => 0),
    ]);

    const total = pendingTx + pendingMovements + pendingShifts + pendingInvoices + pendingReturns + pendingCustomers;

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
