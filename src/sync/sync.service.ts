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
      // Push local → cloud
      await this.syncAll();
      // Pull cloud → local (reverse sync)
      await this.pullFromCloud();
    }
  }

  // REVERSE SYNC: Pull changes from cloud and apply locally
  private async pullFromCloud(): Promise<void> {
    if (!this.cloudApiUrl || !this.cloudApiKey) return;

    try {
      // Get last pull timestamp from DB
      const lastPull = await this.prisma.syncLog.findFirst({
        where: { entityType: 'reverse_sync', action: 'pull' },
        orderBy: { lastAttempt: 'desc' },
      }).catch(() => null);

      const since = lastPull?.lastAttempt?.toISOString() || new Date(0).toISOString();

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(
        `${this.cloudApiUrl}/cloud-sync/pull?since=${encodeURIComponent(since)}`,
        {
          headers: { 'x-api-key': this.cloudApiKey },
          signal: controller.signal,
        },
      );

      clearTimeout(timeout);

      if (!response.ok) {
        console.log('⬇️ Pull: cloud returned', response.status);
        return;
      }

      const data = await response.json();
      console.log(`⬇️ Pull: ${data.counts.employees} employees, ${data.counts.products} products, ${data.counts.cashRegisters} registers, ${data.counts.customers} customers, ${data.counts.suppliers} suppliers, ${data.counts.schedules} schedules`);

      let applied = 0;

      // Apply employees
      for (const emp of data.employees || []) {
        try {
          await this.prisma.employee.upsert({
            where: { employeeNumber: emp.employeeNumber },
            create: {
              id: emp.id, employeeNumber: emp.employeeNumber,
              firstName: emp.firstName, lastName: emp.lastName,
              role: emp.role, department: emp.department,
              phone: emp.phone, email: emp.email,
              hireDate: emp.hireDate ? new Date(emp.hireDate) : new Date(),
              status: emp.status, pin: emp.pin, licenseKey: emp.licenseKey,
              tenantId: emp.tenantId || null,
              syncStatus: 'synced', syncedAt: new Date(),
            },
            update: {
              firstName: emp.firstName, lastName: emp.lastName,
              role: emp.role, department: emp.department,
              phone: emp.phone, email: emp.email,
              status: emp.status, pin: emp.pin, licenseKey: emp.licenseKey,
              tenantId: emp.tenantId || null,
              syncStatus: 'synced', syncedAt: new Date(),
            },
          });
          applied++;
        } catch (e: any) {
          console.log(`⬇️ Pull: skip employee ${emp.employeeNumber}: ${e.message}`);
        }
      }

      // Apply products
      for (const prod of data.products || []) {
        try {
          await this.prisma.product.upsert({
            where: { sku: prod.sku },
            create: {
              id: prod.id, sku: prod.sku, barcode: prod.barcode,
              name: prod.name, description: prod.description,
              category: prod.category, subCategory: prod.subCategory, brand: prod.brand,
              price: prod.price, costPrice: prod.costPrice, taxRate: prod.taxRate,
              wholesalePrice: prod.wholesalePrice, packQuantity: prod.packQuantity,
              packBarcode: prod.packBarcode,
              markdownPrice: prod.markdownPrice, markdownReason: prod.markdownReason,
              markdownNote: prod.markdownNote, markdownStartsAt: prod.markdownStartsAt,
              markdownExpiresAt: prod.markdownExpiresAt,
              stock: prod.stock, minStock: prod.minStock, maxStock: prod.maxStock,
              unit: prod.unit, expiryDate: prod.expiryDate ? new Date(prod.expiryDate) : null,
              supplierId: prod.supplierId, imageUrl: prod.imageUrl, isActive: prod.isActive,
              tenantId: prod.tenantId || null,
              syncStatus: 'synced', syncedAt: new Date(),
            },
            update: {
              name: prod.name, description: prod.description,
              category: prod.category, subCategory: prod.subCategory, brand: prod.brand,
              price: prod.price, costPrice: prod.costPrice, taxRate: prod.taxRate,
              wholesalePrice: prod.wholesalePrice, packQuantity: prod.packQuantity,
              packBarcode: prod.packBarcode,
              markdownPrice: prod.markdownPrice, markdownReason: prod.markdownReason,
              markdownNote: prod.markdownNote, markdownStartsAt: prod.markdownStartsAt,
              markdownExpiresAt: prod.markdownExpiresAt,
              minStock: prod.minStock, maxStock: prod.maxStock,
              unit: prod.unit, expiryDate: prod.expiryDate ? new Date(prod.expiryDate) : null,
              supplierId: prod.supplierId, imageUrl: prod.imageUrl, isActive: prod.isActive,
              tenantId: prod.tenantId || null,
              syncStatus: 'synced', syncedAt: new Date(),
            },
          });
          applied++;
        } catch (e: any) {
          console.log(`⬇️ Pull: skip product ${prod.sku}: ${e.message}`);
        }
      }

      // Apply cash registers
      for (const reg of data.cashRegisters || []) {
        try {
          await this.prisma.cashRegister.upsert({
            where: { code: reg.code },
            create: {
              id: reg.id, name: reg.name, code: reg.code, status: reg.status,
              openingCash: reg.openingCash, currentCash: reg.currentCash,
              location: reg.location, isActive: reg.isActive,
              tenantId: reg.tenantId || null,
              syncStatus: 'synced', syncedAt: new Date(),
            },
            update: {
              name: reg.name, status: reg.status,
              openingCash: reg.openingCash, currentCash: reg.currentCash,
              location: reg.location, isActive: reg.isActive,
              tenantId: reg.tenantId || null,
              syncStatus: 'synced', syncedAt: new Date(),
            },
          });
          applied++;
        } catch (e: any) {
          console.log(`⬇️ Pull: skip register ${reg.code}: ${e.message}`);
        }
      }

      // Apply customers
      for (const cust of data.customers || []) {
        try {
          await this.prisma.customer.upsert({
            where: { customerNumber: cust.customerNumber },
            create: {
              id: cust.id, customerNumber: cust.customerNumber,
              firstName: cust.firstName, lastName: cust.lastName,
              phone: cust.phone, email: cust.email || null,
              points: cust.points || 0, totalSpent: cust.totalSpent || 0,
              tier: cust.tier || 'bronze', isActive: cust.isActive ?? true,
              createdBy: cust.createdBy || null,
              tenantId: cust.tenantId || null,
              syncStatus: 'synced', syncedAt: new Date(),
            },
            update: {
              firstName: cust.firstName, lastName: cust.lastName,
              phone: cust.phone, email: cust.email || null,
              points: cust.points || 0, totalSpent: cust.totalSpent || 0,
              tier: cust.tier || 'bronze', isActive: cust.isActive ?? true,
              tenantId: cust.tenantId || null,
              syncStatus: 'synced', syncedAt: new Date(),
            },
          });
          applied++;
        } catch (e: any) {
          console.log(`⬇️ Pull: skip customer ${cust.customerNumber}: ${e.message}`);
        }
      }

      // Apply suppliers
      for (const sup of data.suppliers || []) {
        try {
          await this.prisma.supplier.upsert({
            where: { id: sup.id },
            create: {
              id: sup.id, name: sup.name, contact: sup.contact,
              phone: sup.phone, email: sup.email || null,
              address: sup.address || null,
              paymentTerms: sup.paymentTerms || '30 jours',
              rating: sup.rating || 0, isActive: sup.isActive ?? true,
              licenseKey: sup.licenseKey || null,
              tenantId: sup.tenantId || null,
              syncStatus: 'synced', syncedAt: new Date(),
            },
            update: {
              name: sup.name, contact: sup.contact,
              phone: sup.phone, email: sup.email || null,
              address: sup.address || null,
              paymentTerms: sup.paymentTerms || '30 jours',
              rating: sup.rating || 0, isActive: sup.isActive ?? true,
              licenseKey: sup.licenseKey || null,
              tenantId: sup.tenantId || null,
              syncStatus: 'synced', syncedAt: new Date(),
            },
          });
          applied++;
        } catch (e: any) {
          console.log(`⬇️ Pull: skip supplier ${sup.id}: ${e.message}`);
        }
      }

      // Apply schedules
      for (const sch of data.schedules || []) {
        try {
          await this.prisma.schedule.upsert({
            where: { id: sch.id },
            create: {
              id: sch.id, employeeId: sch.employeeId, registerId: sch.registerId,
              dayOfWeek: sch.dayOfWeek, startTime: sch.startTime,
              endTime: sch.endTime, breakStart: sch.breakStart || null,
              breakEnd: sch.breakEnd || null, isActive: sch.isActive,
              notes: sch.notes || null,
              tenantId: sch.tenantId || null,
              syncStatus: 'synced', syncedAt: new Date(),
            },
            update: {
              employeeId: sch.employeeId, registerId: sch.registerId,
              dayOfWeek: sch.dayOfWeek, startTime: sch.startTime,
              endTime: sch.endTime, breakStart: sch.breakStart || null,
              breakEnd: sch.breakEnd || null, isActive: sch.isActive,
              notes: sch.notes || null,
              tenantId: sch.tenantId || null,
              syncStatus: 'synced', syncedAt: new Date(),
            },
          });
          applied++;
        } catch (e: any) {
          console.log(`⬇️ Pull: skip schedule ${sch.id}: ${e.message}`);
        }
      }

      // Log the pull
      await this.prisma.syncLog.create({
        data: {
          entityType: 'reverse_sync',
          entityId: 'pull',
          action: 'pull',
          status: 'success',
          attempts: 1,
          lastAttempt: new Date(),
        },
      }).catch(() => {});

      console.log(`⬇️ Pull complete: ${applied} entities applied`);
    } catch (e: any) {
      console.log(`⬇️ Pull error: ${e.message}`);
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

  // Helper générique: POST vers /cloud-sync/<endpoint> et marque synced
  private async syncEntity(
    endpoint: string,
    pending: any[],
    entityType: string,
    markSynced: (id: string) => Promise<any>,
  ): Promise<number> {
    if (pending.length === 0) return 0;

    let synced = 0;
    for (const item of pending) {
      try {
        const response = await fetch(`${this.cloudApiUrl}/cloud-sync/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.cloudApiKey,
          },
          body: JSON.stringify(item),
        });

        if (response.ok) {
          await markSynced(item.id);
          synced++;
        }
      } catch (e: any) {
        await this.prisma.syncLog.create({
          data: {
            entityType,
            entityId: item.id,
            action: 'upsert',
            status: 'failed',
            error: e.message,
            attempts: 1,
            lastAttempt: new Date(),
          },
        }).catch(() => {});
      }
    }
    return synced;
  }

  // Synchroniser tout
  async syncAll() {
    const results = {
      products: 0,
      employees: 0,
      cashRegisters: 0,
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
      { name: 'Products', fn: () => this.syncProducts() },
      { name: 'Employees', fn: () => this.syncEmployees() },
      { name: 'CashRegisters', fn: () => this.syncCashRegisters() },
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

    const total = (results.products + results.employees + results.cashRegisters +
      results.transactions + results.stockMovements + results.shifts + results.invoices +
      results.returns + results.customers + results.expenses + results.revenues +
      results.suppliers + results.purchaseOrders + results.schedules +
      results.loyaltyHistory + results.stores + results.productBatches);
    if (total > 0) {
      console.log(
        `✅ Sync: ${results.products} produits, ${results.employees} employés, ${results.cashRegisters} caisses, ${results.transactions} tx, ${results.stockMovements} stock, ${results.shifts} shifts, ${results.invoices} factures, ${results.returns} retours, ${results.customers} clients, ${results.expenses} dépenses, ${results.revenues} recettes, ${results.suppliers} fournisseurs, ${results.purchaseOrders} achats, ${results.schedules} plannings`,
      );
    }

    if (results.errors.length > 0) {
      console.error('❌ Erreurs sync:', results.errors);
    }

    return results;
  }

  // Sync produits vers cloud
  private async syncProducts(): Promise<number> {
    const pending = await this.prisma.product.findMany({
      where: { syncStatus: 'pending' },
      take: 200,
    }).catch(() => []);

    return this.syncEntity('products', pending, 'product', (id) =>
      this.prisma.product.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync employés vers cloud
  private async syncEmployees(): Promise<number> {
    const pending = await this.prisma.employee.findMany({
      where: { syncStatus: 'pending' },
      take: 100,
    }).catch(() => []);

    return this.syncEntity('employees', pending, 'employee', (id) =>
      this.prisma.employee.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync caisses vers cloud
  private async syncCashRegisters(): Promise<number> {
    const pending = await this.prisma.cashRegister.findMany({
      where: { syncStatus: 'pending' },
      take: 50,
    }).catch(() => []);

    return this.syncEntity('cash-registers', pending, 'cash_register', (id) =>
      this.prisma.cashRegister.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync transactions vers cloud
  private async syncTransactions(): Promise<number> {
    const pending = await this.prisma.transaction.findMany({
      where: { syncStatus: 'pending' },
      include: { items: true },
      take: 100,
    });

    return this.syncEntity('transactions', pending, 'transaction', (id) =>
      this.prisma.transaction.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync mouvements de stock vers cloud
  private async syncStockMovements(): Promise<number> {
    const pending = await this.prisma.stockMovement.findMany({
      where: { syncStatus: 'pending' },
      take: 100,
    });

    return this.syncEntity('stock-movements', pending, 'stock_movement', (id) =>
      this.prisma.stockMovement.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync shifts vers cloud
  private async syncShifts(): Promise<number> {
    const pending = await this.prisma.shift.findMany({
      where: { syncStatus: 'pending' },
      take: 50,
    }).catch(() => []);

    return this.syncEntity('shifts', pending, 'shift', (id) =>
      this.prisma.shift.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync factures vers cloud
  private async syncInvoices(): Promise<number> {
    const pending = await this.prisma.invoice.findMany({
      where: { syncStatus: 'pending' },
      include: { items: true, payments: true },
      take: 50,
    }).catch(() => []);

    return this.syncEntity('invoices', pending, 'invoice', (id) =>
      this.prisma.invoice.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync retours vers cloud
  private async syncReturns(): Promise<number> {
    const pending = await this.prisma.productReturn.findMany({
      where: { syncStatus: 'pending' },
      include: { items: true },
      take: 50,
    }).catch(() => []);

    return this.syncEntity('returns', pending, 'return', (id) =>
      this.prisma.productReturn.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync clients vers cloud
  private async syncCustomers(): Promise<number> {
    const pending = await this.prisma.customer.findMany({
      where: { syncStatus: 'pending' },
      take: 100,
    }).catch(() => []);

    return this.syncEntity('customers', pending, 'customer', (id) =>
      this.prisma.customer.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync dépenses vers cloud
  private async syncExpenses(): Promise<number> {
    const pending = await this.prisma.expense.findMany({
      where: { syncStatus: 'pending' },
      take: 100,
    }).catch(() => []);

    return this.syncEntity('expenses', pending, 'expense', (id) =>
      this.prisma.expense.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync recettes vers cloud
  private async syncRevenues(): Promise<number> {
    const pending = await this.prisma.revenue.findMany({
      where: { syncStatus: 'pending' },
      take: 100,
    }).catch(() => []);

    return this.syncEntity('revenues', pending, 'revenue', (id) =>
      this.prisma.revenue.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync fournisseurs vers cloud
  private async syncSuppliers(): Promise<number> {
    const pending = await this.prisma.supplier.findMany({
      where: { syncStatus: 'pending' },
      take: 100,
    }).catch(() => []);

    return this.syncEntity('suppliers', pending, 'supplier', (id) =>
      this.prisma.supplier.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync commandes d'achat vers cloud
  private async syncPurchaseOrders(): Promise<number> {
    const pending = await this.prisma.purchaseOrder.findMany({
      where: { syncStatus: 'pending' },
      include: { items: true },
      take: 50,
    }).catch(() => []);

    return this.syncEntity('purchase-orders', pending, 'purchase_order', (id) =>
      this.prisma.purchaseOrder.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync plannings vers cloud
  private async syncSchedules(): Promise<number> {
    const pending = await this.prisma.schedule.findMany({
      where: { syncStatus: 'pending' },
      take: 100,
    }).catch(() => []);

    return this.syncEntity('schedules', pending, 'schedule', (id) =>
      this.prisma.schedule.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync historique fidélité vers cloud
  private async syncLoyaltyHistory(): Promise<number> {
    const pending = await this.prisma.loyaltyHistory.findMany({
      where: { syncStatus: 'pending' },
      take: 100,
    }).catch(() => []);

    return this.syncEntity('loyalty-history', pending, 'loyalty_history', (id) =>
      this.prisma.loyaltyHistory.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync stores vers cloud
  private async syncStores(): Promise<number> {
    const pending = await this.prisma.store.findMany({
      where: { syncStatus: 'pending' },
      take: 50,
    }).catch(() => []);

    return this.syncEntity('stores', pending, 'store', (id) =>
      this.prisma.store.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync lots de produits vers cloud
  private async syncProductBatches(): Promise<number> {
    const pending = await this.prisma.productBatch.findMany({
      where: { syncStatus: 'pending' },
      take: 50,
    }).catch(() => []);

    return this.syncEntity('product-batches', pending, 'product_batch', (id) =>
      this.prisma.productBatch.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Statut sync
  async getStatus() {
    const [
      pendingProducts, pendingEmployees, pendingCashRegisters,
      pendingTx, pendingMovements, pendingShifts, pendingInvoices,
      pendingReturns, pendingCustomers, pendingExpenses, pendingRevenues,
      pendingSuppliers, pendingPurchaseOrders, pendingSchedules,
      pendingLoyalty, pendingStores, pendingBatches, failedLogs
    ] = await Promise.all([
      this.prisma.product.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.prisma.employee.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.prisma.cashRegister.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
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

    const total = pendingProducts + pendingEmployees + pendingCashRegisters +
      pendingTx + pendingMovements + pendingShifts + pendingInvoices +
      pendingReturns + pendingCustomers + pendingExpenses + pendingRevenues +
      pendingSuppliers + pendingPurchaseOrders + pendingSchedules +
      pendingLoyalty + pendingStores + pendingBatches;

    return {
      enabled: this.syncEnabled,
      online: this.isOnline,
      cloudApiUrl: this.cloudApiUrl || 'non configuré',
      pending: {
        products: pendingProducts,
        employees: pendingEmployees,
        cashRegisters: pendingCashRegisters,
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
