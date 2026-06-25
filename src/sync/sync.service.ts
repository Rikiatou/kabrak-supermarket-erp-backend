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

    if (results.transactions > 0 || results.stockMovements > 0) {
      console.log(
        `✅ Sync: ${results.transactions} transactions, ${results.stockMovements} mouvements stock`,
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

  // Statut sync
  async getStatus() {
    const [pendingTx, pendingMovements, failedLogs] = await Promise.all([
      this.prisma.transaction.count({ where: { syncStatus: 'pending' } }),
      this.prisma.stockMovement.count({ where: { syncStatus: 'pending' } }),
      this.prisma.syncLog.count({ where: { status: 'failed' } }),
    ]);

    return {
      enabled: this.syncEnabled,
      online: this.isOnline,
      cloudApiUrl: this.cloudApiUrl || 'non configuré',
      pending: {
        transactions: pendingTx,
        stockMovements: pendingMovements,
        total: pendingTx + pendingMovements,
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
