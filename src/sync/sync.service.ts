import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { SyncPrismaService } from './sync-prisma.service';

@Injectable()
export class SyncService implements OnModuleInit {
  private cloudApiUrl: string;
  private cloudApiKey: string;
  private syncTenantId: string;
  private syncEnabled: boolean;
  private isOnline: boolean = true;
  private syncInterval: any;
  // FIX: Guard concurrence — empêche 2 cycles de sync de tourner en même temps
  private isSyncing: boolean = false;

  // Cache: maps local employeeId → cloud employeeId (by employeeNumber)
  private employeeIdMap: Map<string, string> = new Map();
  // Cache: maps local registerId → cloud registerId (by code)
  private registerIdMap: Map<string, string> = new Map();
  // Cache: maps local productId → cloud productId (by sku)
  private productIdMap: Map<string, string> = new Map();

  // FIX: Cache cloud pull data to avoid downloading 10k+ products every 5 min
  // (was exhausting Neon free-tier data transfer quota)
  private cloudDataCache: any = null;
  private cloudDataCacheAt: number = 0;
  private readonly CLOUD_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  // Track last product pull to space it out (products are large, pull less often)
  private lastProductPull: number = 0;
  private readonly PRODUCT_PULL_INTERVAL = 60 * 60 * 1000; // 1 hour

  constructor(
    private prisma: PrismaService,
    private syncPrisma: SyncPrismaService,
    private configService: ConfigService,
  ) {
    this.cloudApiUrl = this.configService.get<string>('CLOUD_API_URL', '');
    this.cloudApiKey = this.configService.get<string>('CLOUD_API_KEY', '');
    this.syncTenantId = this.configService.get<string>('SYNC_TENANT_ID', '');
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
    // FIX: Empêcher deux cycles de sync simultanés (contention DB/réseau)
    if (this.isSyncing) {
      console.log('⏳ Sync déjà en cours, cycle ignoré');
      return;
    }

    const wasOnline = this.isOnline;
    this.isOnline = await this.checkInternetConnection();

    if (!wasOnline && this.isOnline) {
      console.log('🌐 Internet restauré - démarrage sync...');
    }

    if (this.isOnline && this.syncEnabled) {
      this.isSyncing = true;
      const startTime = Date.now();
      try {
        // Push local → cloud
        await this.syncAll();
        // Pull cloud → local (reverse sync)
        await this.pullFromCloud();
        // Purge old SyncLog entries (keep last 7 days only)
        await this.purgeSyncLog();
      } finally {
        this.isSyncing = false;
        const duration = Date.now() - startTime;
        if (duration > 10000) {
          console.warn(`⚠️ Sync a duré ${Math.round(duration / 1000)}s — surveiller les performances`);
        }
      }
    }
  }

  // REVERSE SYNC: Pull changes from cloud and apply locally
  private async pullFromCloud(): Promise<void> {
    if (!this.cloudApiUrl || !this.cloudApiKey) return;

    try {
      // Get last pull timestamp from DB
      const lastPull = await this.syncPrisma.syncLog.findFirst({
        where: { entityType: 'reverse_sync', action: 'pull' },
        orderBy: { lastAttempt: 'desc' },
      }).catch(() => null);

      const since = lastPull?.lastAttempt?.toISOString() || new Date(0).toISOString();

      // FIX: Space out product pulls — they're huge and rarely change.
      // Pull products only once per hour, but pull small entities every cycle.
      const now = Date.now();
      const shouldPullProducts = (now - this.lastProductPull) >= this.PRODUCT_PULL_INTERVAL;

      // FIX: Paginate products (the large table) to avoid loading tens of
      // thousands of rows into memory at once on the mini-PC. Other entities
      // are small and returned in full on the first page only.
      const PAGE_SIZE = 500;
      let offset = 0;
      let applied = 0;
      let page = 0;
      let productsTotal: number | null = null;
      let smallEntitiesApplied = false;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);

        // Skip products if not time yet (pull only once per hour)
        const productsLimit = shouldPullProducts ? PAGE_SIZE : 0;

        const url = `${this.cloudApiUrl}/cloud-sync/pull?since=${encodeURIComponent(since)}`
          + `&productsLimit=${productsLimit}&productsOffset=${offset}`
          + (this.syncTenantId ? `&tenantId=${encodeURIComponent(this.syncTenantId)}` : '');

        const response = await fetch(url, {
          headers: { 'x-api-key': this.cloudApiKey },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          console.log('⬇️ Pull: cloud returned', response.status);
          return;
        }

        const data = await response.json();

        if (productsTotal === null && data.productsTotal != null) {
          productsTotal = data.productsTotal;
          if (shouldPullProducts) {
            console.log(`⬇️ Pull: ${productsTotal} products to fetch (paged ${PAGE_SIZE}/page)`);
          } else {
            console.log(`⬇️ Pull: skipping products (last pull ${Math.round((now - this.lastProductPull) / 60000)}min ago)`);
          }
        }

        // Small entities: apply only once (first page)
        if (!smallEntitiesApplied) {
          console.log(`⬇️ Pull: ${data.counts.employees} employees, ${data.counts.cashRegisters} registers, ${data.counts.customers} customers, ${data.counts.suppliers} suppliers, ${data.counts.schedules} schedules`);
          applied += await this.applyEmployees(data.employees || []);
          applied += await this.applyCashRegisters(data.cashRegisters || []);
          applied += await this.applyCustomers(data.customers || []);
          applied += await this.applySuppliers(data.suppliers || []);
          applied += await this.applySchedules(data.schedules || []);
          smallEntitiesApplied = true;
        }

        // Products: apply every page (only if shouldPullProducts)
        if (shouldPullProducts) {
          const before = applied;
          applied += await this.applyProducts(data.products || []);
          page++;
          console.log(`⬇️ Pull page ${page}: +${applied - before} products (offset ${offset})`);
        }

        if (!data.productsHasMore || !shouldPullProducts) break;
        offset += PAGE_SIZE;

        // Safety valve: never loop forever even if cloud misreports
        if (productsTotal != null && offset >= productsTotal) break;
        if (page > 200) {
          console.warn('⬇️ Pull: exceeded 200 pages, aborting loop');
          break;
        }
      }

      // Update product pull timestamp only if we actually pulled products
      if (shouldPullProducts) {
        this.lastProductPull = now;
      }

      // Log the pull ONLY after the final page succeeds, so a crash mid-pull
      // restarts from the same `since` timestamp on the next cycle.
      await this.syncPrisma.syncLog.create({
        data: {
          entityType: 'reverse_sync',
          entityId: 'pull',
          action: 'pull',
          status: 'success',
          attempts: 1,
          lastAttempt: new Date(),
        },
      }).catch(() => {});

      console.log(`⬇️ Pull complete: ${applied} entities applied across ${page} page(s)`);
    } catch (e: any) {
      console.log(`⬇️ Pull error: ${e.message}`);
    }
  }

  // Purge old SyncLog entries to prevent table bloat
  private async purgeSyncLog(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
      const deleted = await this.syncPrisma.syncLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      if (deleted.count > 0) {
        console.log(`🗑️ Purged ${deleted.count} old SyncLog entries (>7 days)`);
      }
    } catch (e: any) {
      console.log(`🗑️ SyncLog purge error: ${e.message}`);
    }
  }

  // --- Pull helpers (extracted from pullFromCloud for readability) ---

  private async applyEmployees(employees: any[]): Promise<number> {
    let applied = 0;
    for (const emp of employees) {
      try {
        const tenantId = emp.tenantId || null;
        const existing = await this.syncPrisma.employee.findFirst({
          where: { employeeNumber: emp.employeeNumber, tenantId },
          select: { id: true },
        });
        if (existing) {
          await this.syncPrisma.employee.update({
            where: { id: existing.id },
            data: {
              firstName: emp.firstName, lastName: emp.lastName,
              role: emp.role, department: emp.department,
              phone: emp.phone, email: emp.email,
              status: emp.status, licenseKey: emp.licenseKey,
              tenantId,
              syncStatus: 'synced', syncedAt: new Date(),
              // NOTE: pin is NOT updated from cloud — local PIN is authoritative
            },
          });
        } else {
          await this.syncPrisma.employee.create({
            data: {
              id: emp.id, employeeNumber: emp.employeeNumber,
              firstName: emp.firstName, lastName: emp.lastName,
              role: emp.role, department: emp.department,
              phone: emp.phone, email: emp.email,
              hireDate: emp.hireDate ? new Date(emp.hireDate) : new Date(),
              status: emp.status, pin: emp.pin, licenseKey: emp.licenseKey,
              tenantId,
              syncStatus: 'synced', syncedAt: new Date(),
            },
          });
        }
        applied++;
      } catch (e: any) {
        console.log(`⬇️ Pull: skip employee ${emp.employeeNumber}: ${e.message}`);
      }
    }
    return applied;
  }

  private async applyProducts(products: any[]): Promise<number> {
    if (products.length === 0) return 0;

    // BATCH: Fetch all existing products in ONE query instead of N
    const ids = products.map(p => p.id).filter(Boolean);
    const skus = products.map(p => p.sku).filter(Boolean);
    const barcodes = products.map(p => p.barcode).filter(Boolean);

    const existing = await this.syncPrisma.product.findMany({
      where: {
        OR: [
          { id: { in: ids } },
          { sku: { in: skus } },
          ...(barcodes.length > 0 ? [{ barcode: { in: barcodes } }] : []),
        ],
      },
      select: { id: true, sku: true, barcode: true, updatedAt: true },
    });

    const existingMap = new Map<string, any>();
    for (const e of existing) {
      existingMap.set(e.id, e);
      if (e.sku) existingMap.set(e.sku, e);
      if (e.barcode) existingMap.set(e.barcode, e);
    }

    let applied = 0;
    for (const prod of products) {
      try {
        const match = existingMap.get(prod.id) || existingMap.get(prod.sku) || (prod.barcode && existingMap.get(prod.barcode));

        const common = {
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
        };

        if (match) {
          // SKIP no-op: if cloud updatedAt <= local updatedAt, skip update
          // (local changes are fresher, don't overwrite with stale cloud data)
          const cloudUpdated = prod.updatedAt ? new Date(prod.updatedAt).getTime() : 0;
          const localUpdated = match.updatedAt ? new Date(match.updatedAt).getTime() : 0;
          if (cloudUpdated <= localUpdated) {
            applied++;
            continue;
          }

          await this.syncPrisma.product.update({
            where: { id: match.id },
            data: common,
          });
        } else {
          await this.syncPrisma.product.create({
            data: {
              ...common,
              id: prod.id, sku: prod.sku, barcode: prod.barcode,
              stock: prod.stock,
            },
          });
        }
        applied++;
      } catch (e: any) {
        console.log(`⬇️ Pull: skip product ${prod.sku}: ${e.message}`);
      }
    }
    return applied;
  }

  private async applyCashRegisters(registers: any[]): Promise<number> {
    let applied = 0;
    for (const reg of registers) {
      try {
        const tenantId = reg.tenantId || null;
        const existing = await this.syncPrisma.cashRegister.findFirst({
          where: { code: reg.code, tenantId },
          select: { id: true },
        });
        const common = {
          name: reg.name, status: reg.status,
          openingCash: reg.openingCash, currentCash: reg.currentCash,
          location: reg.location, isActive: reg.isActive,
          tenantId,
          syncStatus: 'synced', syncedAt: new Date(),
        };
        if (existing) {
          await this.syncPrisma.cashRegister.update({
            where: { id: existing.id },
            data: common,
          });
        } else {
          await this.syncPrisma.cashRegister.create({
            data: { ...common, id: reg.id, code: reg.code },
          });
        }
        applied++;
      } catch (e: any) {
        console.log(`⬇️ Pull: skip register ${reg.code}: ${e.message}`);
      }
    }
    return applied;
  }

  private async applyCustomers(customers: any[]): Promise<number> {
    let applied = 0;
    for (const cust of customers) {
      try {
        const tenantId = cust.tenantId || null;
        const existing = await this.syncPrisma.customer.findFirst({
          where: { customerNumber: cust.customerNumber, tenantId },
          select: { id: true },
        });
        const common = {
          firstName: cust.firstName, lastName: cust.lastName,
          phone: cust.phone, email: cust.email || null,
          points: cust.points || 0, totalSpent: cust.totalSpent || 0,
          tier: cust.tier || 'bronze', isActive: cust.isActive ?? true,
          tenantId,
          syncStatus: 'synced', syncedAt: new Date(),
        };
        if (existing) {
          await this.syncPrisma.customer.update({
            where: { id: existing.id },
            data: common,
          });
        } else {
          await this.syncPrisma.customer.create({
            data: { ...common, id: cust.id, customerNumber: cust.customerNumber, createdBy: cust.createdBy || null },
          });
        }
        applied++;
      } catch (e: any) {
        console.log(`⬇️ Pull: skip customer ${cust.customerNumber}: ${e.message}`);
      }
    }
    return applied;
  }

  private async applySuppliers(suppliers: any[]): Promise<number> {
    let applied = 0;
    for (const sup of suppliers) {
      try {
        // FIX: Don't overwrite local real names with cloud stub names.
        // The cloud may have "(en attente de sync)" if a PO was synced
        // before the supplier, creating a stub via ensureStub.
        if (sup.name === '(en attente de sync)') {
          const local = await this.syncPrisma.supplier.findUnique({
            where: { id: sup.id },
            select: { name: true },
          });
          if (local && local.name !== '(en attente de sync)') {
            // Local has a real name — skip this stub update
            applied++;
            continue;
          }
        }
        await this.syncPrisma.supplier.upsert({
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
    return applied;
  }

  private async applySchedules(schedules: any[]): Promise<number> {
    let applied = 0;
    for (const sch of schedules) {
      try {
        await this.syncPrisma.schedule.upsert({
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
    return applied;
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
  /**
   * IDs "bloqués": items ayant échoué >= MAX_FAILURES fois dans les dernières 24h.
   *
   * Ils sont EXCLUS de la requête SQL des items pending (via `notIn`), et non
   * pas seulement sautés dans la boucle. Sinon ils occuperaient les places du
   * `take: N` et bloqueraient les items récents — exactement le bug que
   * l'ancien code "réglait" en les marquant `synced` (= perte de données).
   *
   * Ils restent `syncStatus: 'pending'` : AUCUNE donnée n'est perdue. Ils
   * redeviennent éligibles automatiquement après 24h (fenêtre glissante).
   */
  private static readonly MAX_FAILURES = 5;
  private static readonly MAX_BLOCKED = 500; // borne le `notIn` pour ne pas exploser la requête

  private async getBlockedIds(entityType: string): Promise<string[]> {
    const grouped = await this.syncPrisma.syncLog.groupBy({
      by: ['entityId'],
      where: {
        entityType,
        status: 'failed',
        lastAttempt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      _count: { entityId: true },
      having: { entityId: { _count: { gte: SyncService.MAX_FAILURES } } },
      orderBy: { _count: { entityId: 'desc' } },
      take: SyncService.MAX_BLOCKED,
    }).catch(() => [] as any[]);

    return (grouped as any[]).map((g) => g.entityId as string);
  }

  /** Clause `where` pour les items à pousser, en excluant les items bloqués. */
  private async pendingWhere(entityType: string): Promise<any> {
    const blocked = await this.getBlockedIds(entityType);
    if (blocked.length === 0) return { syncStatus: 'pending' };
    console.log(`⏭️ ${entityType}: ${blocked.length} item(s) en échec répété, exclus de ce cycle (toujours pending, non perdus)`);
    return { syncStatus: 'pending', id: { notIn: blocked } };
  }

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
        } else {
          const errText = await response.text().catch(() => '');
          await this.syncPrisma.syncLog.create({
            data: {
              entityType,
              entityId: item.id,
              action: 'upsert',
              status: 'failed',
              error: `HTTP ${response.status}: ${errText.slice(0, 200)}`,
              attempts: 1,
              lastAttempt: new Date(),
            },
          }).catch(() => {});
        }
      } catch (e: any) {
        await this.syncPrisma.syncLog.create({
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
    // Clear ID maps at start of each cycle (cloud IDs may change)
    // FIX: Only clear maps — the cloud data is cached in buildIdMaps (30 min TTL)
    this.employeeIdMap.clear();
    this.registerIdMap.clear();
    this.productIdMap.clear();

    // Build ID maps first (needed for transaction sync)
    await this.buildIdMaps();

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
    const pending = await this.syncPrisma.product.findMany({
      where: await this.pendingWhere('product'),
      take: 200,
    }).catch(() => []);

    return this.syncEntity('products', pending, 'product', (id) =>
      this.syncPrisma.product.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync employés vers cloud
  private async syncEmployees(): Promise<number> {
    const pending = await this.syncPrisma.employee.findMany({
      where: await this.pendingWhere('employee'),
      take: 100,
    }).catch(() => []);

    return this.syncEntity('employees', pending, 'employee', (id) =>
      this.syncPrisma.employee.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync caisses vers cloud
  private async syncCashRegisters(): Promise<number> {
    const pending = await this.syncPrisma.cashRegister.findMany({
      where: await this.pendingWhere('cash_register'),
      take: 50,
    }).catch(() => []);

    return this.syncEntity('cash-registers', pending, 'cash_register', (id) =>
      this.syncPrisma.cashRegister.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync transactions vers cloud
  // Build ID mapping caches by fetching cloud employees and registers
  // This maps local IDs → cloud IDs using business keys (employeeNumber, code, sku)
  // OPTIMIZED: No longer downloads 10k+ products from cloud.
  // Products use the SAME id on both sides (upsertProduct creates with local id),
  // so productIdMap is unnecessary — the fallback || item.productId in syncTransactions
  // already gives the correct cloud id.
  // We only fetch employees + registers (small tables, ~11 + ~12 rows) for ID mapping,
  // since those can have different IDs if created independently on cloud first.
  private async buildIdMaps(): Promise<void> {
    if (!this.cloudApiUrl || !this.cloudApiKey) return;

    try {
      // FIX: Use cached cloud data if fresh (within TTL) to avoid redundant requests
      const now = Date.now();
      let data: any = null;

      if (this.cloudDataCache && (now - this.cloudDataCacheAt) < this.CLOUD_CACHE_TTL) {
        data = this.cloudDataCache;
      } else {
        // Only fetch employees + registers (small payloads, no products)
        // Use productsLimit=0 to skip the products table entirely
        const empRes = await fetch(`${this.cloudApiUrl}/cloud-sync/pull?since=1970-01-01T00:00:00.000Z`
          + `&productsLimit=0`
          + (this.syncTenantId ? `&tenantId=${encodeURIComponent(this.syncTenantId)}` : ''), {
          headers: { 'x-api-key': this.cloudApiKey },
        });
        if (empRes.ok) {
          data = await empRes.json();
          this.cloudDataCache = data;
          this.cloudDataCacheAt = now;
        }
      }

      if (data) {
        // Batch: fetch all local employees in ONE query
        const cloudEmpNums = (data.employees || []).map((e: any) => e.employeeNumber).filter(Boolean);
        if (cloudEmpNums.length > 0) {
          const localEmps = await this.syncPrisma.employee.findMany({
            where: { employeeNumber: { in: cloudEmpNums } },
            select: { id: true, employeeNumber: true },
          });
          const localEmpMap = new Map(localEmps.map(e => [e.employeeNumber, e.id]));
          for (const emp of data.employees || []) {
            const localId = localEmpMap.get(emp.employeeNumber);
            if (localId) {
              this.employeeIdMap.set(localId, emp.id);
            }
          }
        }

        // Batch: fetch all local registers in ONE query
        const cloudRegCodes = (data.cashRegisters || []).map((r: any) => r.code).filter(Boolean);
        if (cloudRegCodes.length > 0) {
          const localRegs = await this.syncPrisma.cashRegister.findMany({
            where: { code: { in: cloudRegCodes } },
            select: { id: true, code: true },
          });
          const localRegMap = new Map(localRegs.map(r => [r.code, r.id]));
          for (const reg of data.cashRegisters || []) {
            const localId = localRegMap.get(reg.code);
            if (localId) {
              this.registerIdMap.set(localId, reg.id);
            }
          }
        }

        // NOTE: No product map is built. Products share the same id on both sides
        // (upsertProduct creates with the local id), so productIdMap is unnecessary.
        // syncTransactions uses `this.productIdMap.get(item.productId) || item.productId`
        // and the fallback always returns the correct id.

        console.log(`🗺️ ID maps: ${this.employeeIdMap.size} employees, ${this.registerIdMap.size} registers (products: same-id, no map needed)`);
      }
    } catch (e: any) {
      console.log(`🗺️ Build ID maps error: ${e.message}`);
    }
  }

  private async syncTransactions(): Promise<number> {
    const pending = await this.syncPrisma.transaction.findMany({
      where: await this.pendingWhere('transaction'),
      include: { items: true },
      take: 100,
    });

    if (pending.length === 0) return 0;

    // Build ID maps if not cached
    if (this.employeeIdMap.size === 0) {
      await this.buildIdMaps();
    }

    // Map local IDs to cloud IDs before sending
    const mapped = pending.map((tx) => ({
      ...tx,
      cashierId: this.employeeIdMap.get(tx.cashierId) || tx.cashierId,
      registerId: tx.registerId ? (this.registerIdMap.get(tx.registerId) || tx.registerId) : null,
      customerId: tx.customerId || null,
      items: tx.items.map((item) => ({
        ...item,
        productId: this.productIdMap.get(item.productId) || item.productId,
      })),
    }));

    return this.syncEntity('transactions', mapped, 'transaction', (id) =>
      this.syncPrisma.transaction.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync mouvements de stock vers cloud
  private async syncStockMovements(): Promise<number> {
    // FIX: Trier par date ascendante pour traiter les plus anciens d'abord.
    // Sans tri, Prisma renvoie un ordre non-déterministe → les mêmes items échouent
    // indéfiniment et bloquent les plus récents (gifts, etc.).
    // Augmenter à 200 pour vider la file plus vite.
    const pending = await this.syncPrisma.stockMovement.findMany({
      where: await this.pendingWhere('stock_movement'),
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    return this.syncEntity('stock-movements', pending, 'stock_movement', (id) =>
      this.syncPrisma.stockMovement.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync shifts vers cloud
  private async syncShifts(): Promise<number> {
    const pending = await this.syncPrisma.shift.findMany({
      where: await this.pendingWhere('shift'),
      take: 50,
    }).catch(() => []);

    return this.syncEntity('shifts', pending, 'shift', (id) =>
      this.syncPrisma.shift.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync factures vers cloud
  private async syncInvoices(): Promise<number> {
    const pending = await this.syncPrisma.invoice.findMany({
      where: await this.pendingWhere('invoice'),
      include: { items: true, payments: true },
      take: 50,
    }).catch(() => []);

    return this.syncEntity('invoices', pending, 'invoice', (id) =>
      this.syncPrisma.invoice.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync retours vers cloud
  private async syncReturns(): Promise<number> {
    const pending = await this.syncPrisma.productReturn.findMany({
      where: await this.pendingWhere('return'),
      include: { items: true },
      take: 50,
    }).catch(() => []);

    return this.syncEntity('returns', pending, 'return', (id) =>
      this.syncPrisma.productReturn.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync clients vers cloud
  private async syncCustomers(): Promise<number> {
    const pending = await this.syncPrisma.customer.findMany({
      where: await this.pendingWhere('customer'),
      take: 100,
    }).catch(() => []);

    return this.syncEntity('customers', pending, 'customer', (id) =>
      this.syncPrisma.customer.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync dépenses vers cloud
  private async syncExpenses(): Promise<number> {
    const pending = await this.syncPrisma.expense.findMany({
      where: await this.pendingWhere('expense'),
      take: 100,
    }).catch(() => []);

    return this.syncEntity('expenses', pending, 'expense', (id) =>
      this.syncPrisma.expense.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync recettes vers cloud
  private async syncRevenues(): Promise<number> {
    const pending = await this.syncPrisma.revenue.findMany({
      where: await this.pendingWhere('revenue'),
      take: 100,
    }).catch(() => []);

    return this.syncEntity('revenues', pending, 'revenue', (id) =>
      this.syncPrisma.revenue.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync fournisseurs vers cloud
  private async syncSuppliers(): Promise<number> {
    const pending = await this.syncPrisma.supplier.findMany({
      where: await this.pendingWhere('supplier'),
      take: 100,
    }).catch(() => []);

    return this.syncEntity('suppliers', pending, 'supplier', (id) =>
      this.syncPrisma.supplier.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync commandes d'achat vers cloud
  private async syncPurchaseOrders(): Promise<number> {
    const pending = await this.syncPrisma.purchaseOrder.findMany({
      where: await this.pendingWhere('purchase_order'),
      include: { items: true },
      take: 50,
    }).catch(() => []);

    return this.syncEntity('purchase-orders', pending, 'purchase_order', (id) =>
      this.syncPrisma.purchaseOrder.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync plannings vers cloud
  private async syncSchedules(): Promise<number> {
    const pending = await this.syncPrisma.schedule.findMany({
      where: await this.pendingWhere('schedule'),
      take: 100,
    }).catch(() => []);

    return this.syncEntity('schedules', pending, 'schedule', (id) =>
      this.syncPrisma.schedule.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync historique fidélité vers cloud
  private async syncLoyaltyHistory(): Promise<number> {
    const pending = await this.syncPrisma.loyaltyHistory.findMany({
      where: await this.pendingWhere('loyalty_history'),
      take: 100,
    }).catch(() => []);

    return this.syncEntity('loyalty-history', pending, 'loyalty_history', (id) =>
      this.syncPrisma.loyaltyHistory.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync stores vers cloud
  private async syncStores(): Promise<number> {
    const pending = await this.syncPrisma.store.findMany({
      where: await this.pendingWhere('store'),
      take: 50,
    }).catch(() => []);

    return this.syncEntity('stores', pending, 'store', (id) =>
      this.syncPrisma.store.update({
        where: { id },
        data: { syncStatus: 'synced', syncedAt: new Date() },
      }),
    );
  }

  // Sync lots de produits vers cloud
  private async syncProductBatches(): Promise<number> {
    const pending = await this.syncPrisma.productBatch.findMany({
      where: await this.pendingWhere('product_batch'),
      take: 50,
    }).catch(() => []);

    return this.syncEntity('product-batches', pending, 'product_batch', (id) =>
      this.syncPrisma.productBatch.update({
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
      this.syncPrisma.product.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.syncPrisma.employee.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.syncPrisma.cashRegister.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.syncPrisma.transaction.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.syncPrisma.stockMovement.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.syncPrisma.shift.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.syncPrisma.invoice.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.syncPrisma.productReturn.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.syncPrisma.customer.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.syncPrisma.expense.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.syncPrisma.revenue.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.syncPrisma.supplier.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.syncPrisma.purchaseOrder.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.syncPrisma.schedule.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.syncPrisma.loyaltyHistory.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.syncPrisma.store.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.syncPrisma.productBatch.count({ where: { syncStatus: 'pending' } }).catch(() => 0),
      this.syncPrisma.syncLog.count({ where: { status: 'failed' } }).catch(() => 0),
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
