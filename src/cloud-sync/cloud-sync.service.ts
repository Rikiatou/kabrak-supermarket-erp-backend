import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

// Service exécuté sur le CLOUD pour recevoir les données sync depuis le local
// Utilise upsert pour gérer create + update en un seul appel
@Injectable()
export class CloudSyncService {
  constructor(private prisma: PrismaService) {}

  // Crée un stub minimal si l'enregistrement FK n'existe pas encore dans le cloud.
  // Évite les erreurs "Foreign key constraint violated" quand le sync d'une entité
  // parente (supplier, employee, product, etc.) a échoué ou n'est pas encore arrivé.
  // Le vrai sync upsertera par la suite et mettra à jour le stub avec les vraies données.
  private async ensureStub(model: string, id: string, tenantId?: string | null): Promise<void> {
    if (!id) return;
    try {
      const existing = await (this.prisma as any)[model].findUnique({ where: { id }, select: { id: true } });
      if (existing) return;

      const stubData: any = { id };
      if (tenantId !== undefined) stubData.tenantId = tenantId || null;

      // Champs NOT NULL minimaux par modèle
      switch (model) {
        case 'supplier':
          stubData.name = '(en attente de sync)';
          stubData.contact = '';
          stubData.phone = '';
          break;
        case 'employee':
          stubData.employeeNumber = `STUB-${id.slice(-8)}`;
          stubData.firstName = '(en attente)';
          stubData.lastName = '';
          stubData.role = 'cashier';
          stubData.department = '';
          stubData.hireDate = new Date();
          stubData.status = 'active';
          stubData.pin = '0000';
          break;
        case 'product':
          stubData.sku = `STUB-${id.slice(-8)}`;
          stubData.name = '(en attente de sync)';
          stubData.price = 0;
          stubData.stock = 0;
          stubData.unit = 'unité';
          break;
        case 'cashRegister':
          stubData.name = '(en attente)';
          stubData.code = `STUB-${id.slice(-8)}`;
          stubData.status = 'closed';
          break;
        case 'customer':
          stubData.customerNumber = `STUB-${id.slice(-8)}`;
          stubData.firstName = '(en attente)';
          stubData.lastName = '';
          stubData.phone = '';
          break;
        case 'invoice':
          stubData.number = `STUB-${id.slice(-8)}`;
          stubData.date = new Date();
          stubData.total = 0;
          stubData.status = 'draft';
          break;
        case 'transaction':
          stubData.transactionNumber = `STUB-${id.slice(-8)}`;
          stubData.date = new Date();
          stubData.total = 0;
          stubData.paymentMethod = 'cash';
          stubData.status = 'completed';
          stubData.cashierId = 'STUB-NONEXISTENT'; // will be set by real sync
          break;
      }

      await (this.prisma as any)[model].create({ data: stubData });
      console.log(`📋 Stub ${model} créé pour FK (id=${id}) — sera upserté par le vrai sync`);
    } catch (e: any) {
      // Si le stub ne peut pas être créé (ex: contrainte unique), on ignore
      // le PO/tx sera re-syncé au prochain cycle
      console.log(`⚠️ Stub ${model} ${id} échec: ${e.message?.slice(0, 100)}`);
    }
  }

  async upsertProduct(data: any) {
    const {
      id, sku, barcode, name, description, category, subCategory, brand,
      price, costPrice, taxRate, wholesalePrice, packQuantity, packBarcode,
      markdownPrice, markdownReason, markdownNote, markdownStartsAt, markdownExpiresAt,
      stock, minStock, maxStock, unit, expiryDate, supplierId, imageUrl, isActive,
      tenantId,
      createdAt, updatedAt,
    } = data;

    // FK nullable: supplierId — si présent, s'assurer que le supplier existe
    if (supplierId) {
      await this.ensureStub('supplier', supplierId, tenantId);
    }

    const common = {
      barcode, name, description, category, subCategory, brand,
      price, costPrice, taxRate, wholesalePrice, packQuantity, packBarcode,
      markdownPrice, markdownReason, markdownNote, markdownStartsAt, markdownExpiresAt,
      stock, minStock, maxStock, unit, expiryDate: expiryDate ? new Date(expiryDate) : null,
      supplierId, imageUrl, isActive,
      tenantId: tenantId || null,
      syncStatus: 'synced', syncedAt: new Date(),
    };

    // sku est unique PAR tenant (pas globalement) → lookup scopé par tenant
    const existing = await this.prisma.product.findFirst({
      where: { sku, tenantId: tenantId || null },
      select: { id: true },
    });

    if (existing) {
      return this.prisma.product.update({
        where: { id: existing.id },
        data: { ...common, updatedAt: updatedAt ? new Date(updatedAt) : undefined },
      });
    }
    return this.prisma.product.create({
      data: {
        ...common, id, sku,
        createdAt: createdAt ? new Date(createdAt) : undefined,
        updatedAt: updatedAt ? new Date(updatedAt) : undefined,
      },
    });
  }

  async upsertEmployee(data: any) {
    const {
      id, employeeNumber, firstName, lastName, role, department,
      phone, email, hireDate, status, pin, licenseKey, tenantId,
      createdAt, updatedAt,
    } = data;

    const common = {
      firstName, lastName, role, department,
      phone, email, hireDate: new Date(hireDate), status, pin, licenseKey,
      tenantId: tenantId || null,
      syncStatus: 'synced', syncedAt: new Date(),
    };

    // employeeNumber est unique PAR tenant → lookup scopé
    const existing = await this.prisma.employee.findFirst({
      where: { employeeNumber, tenantId: tenantId || null },
      select: { id: true },
    });

    if (existing) {
      return this.prisma.employee.update({
        where: { id: existing.id },
        data: { ...common, updatedAt: updatedAt ? new Date(updatedAt) : undefined },
      });
    }
    return this.prisma.employee.create({
      data: {
        ...common, id, employeeNumber,
        createdAt: createdAt ? new Date(createdAt) : undefined,
        updatedAt: updatedAt ? new Date(updatedAt) : undefined,
      },
    });
  }

  async upsertCashRegister(data: any) {
    const {
      id, name, code, status, openingCash, currentCash,
      location, isActive, tenantId, createdAt, updatedAt,
    } = data;

    const common = {
      name, status, openingCash, currentCash,
      location, isActive,
      tenantId: tenantId || null,
      syncStatus: 'synced', syncedAt: new Date(),
    };

    // code est unique PAR tenant → lookup scopé
    const existing = await this.prisma.cashRegister.findFirst({
      where: { code, tenantId: tenantId || null },
      select: { id: true },
    });

    if (existing) {
      return this.prisma.cashRegister.update({
        where: { id: existing.id },
        data: { ...common, updatedAt: updatedAt ? new Date(updatedAt) : undefined },
      });
    }
    return this.prisma.cashRegister.create({
      data: {
        ...common, id, code,
        createdAt: createdAt ? new Date(createdAt) : undefined,
        updatedAt: updatedAt ? new Date(updatedAt) : undefined,
      },
    });
  }

  // Upsert générique pour les entités déjà syncées (transactions, suppliers, etc.)
  // Permet de migrer progressivement le sync existant vers upsert
  async upsertTransaction(data: any) {
    const { items, ...txData } = data;

    // FK NOT NULL: cashierId (employee)
    if (txData.cashierId) {
      await this.ensureStub('employee', txData.cashierId, txData.tenantId);
    }
    // FK nullable mais si présente doit exister
    if (txData.registerId) {
      await this.ensureStub('cashRegister', txData.registerId, txData.tenantId);
    }
    if (txData.customerId) {
      await this.ensureStub('customer', txData.customerId, txData.tenantId);
    }
    if (txData.invoiceId) {
      await this.ensureStub('invoice', txData.invoiceId, txData.tenantId);
    }

    const tx = await this.prisma.transaction.upsert({
      where: { id: txData.id },
      create: {
        ...txData,
        date: txData.date ? new Date(txData.date) : undefined,
        createdAt: txData.createdAt ? new Date(txData.createdAt) : undefined,
        syncStatus: 'synced', syncedAt: new Date(),
      },
      update: {
        ...txData,
        date: txData.date ? new Date(txData.date) : undefined,
        syncStatus: 'synced', syncedAt: new Date(),
      },
    });

    // Upsert des items
    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (item.productId) {
          await this.ensureStub('product', item.productId, txData.tenantId);
        }
        await this.prisma.transactionItem.upsert({
          where: { id: item.id },
          create: { ...item },
          update: { ...item },
        }).catch(() => {});
      }
    }
    return tx;
  }

  async upsertSupplier(data: any) {
    return this.prisma.supplier.upsert({
      where: { id: data.id },
      create: {
        ...data,
        createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
        syncStatus: 'synced', syncedAt: new Date(),
      },
      update: {
        ...data,
        syncStatus: 'synced', syncedAt: new Date(),
      },
    });
  }

  async upsertPurchaseOrder(data: any) {
    const { items, ...poData } = data;

    // S'assurer que le supplier existe dans le cloud (FK NOT NULL)
    if (poData.supplierId) {
      await this.ensureStub('supplier', poData.supplierId, poData.tenantId);
    }

    const po = await this.prisma.purchaseOrder.upsert({
      where: { id: poData.id },
      create: {
        ...poData,
        orderDate: poData.orderDate ? new Date(poData.orderDate) : undefined,
        createdAt: poData.createdAt ? new Date(poData.createdAt) : undefined,
        syncStatus: 'synced', syncedAt: new Date(),
      },
      update: {
        ...poData,
        syncStatus: 'synced', syncedAt: new Date(),
      },
    });

    if (items && Array.isArray(items)) {
      for (const item of items) {
        await this.prisma.purchaseOrderItem.upsert({
          where: { id: item.id },
          create: { ...item },
          update: { ...item },
        }).catch(() => {});
      }
    }
    return po;
  }

  async upsertCustomer(data: any) {
    const { id, customerNumber, ...rest } = data;
    const tenantId = rest.tenantId || null;

    // customerNumber est unique PAR tenant → lookup scopé
    const existing = await this.prisma.customer.findFirst({
      where: { customerNumber, tenantId: tenantId as any },
      select: { id: true },
    });

    const common = {
      ...rest,
      tenantId: tenantId as any,
      syncStatus: 'synced', syncedAt: new Date(),
    };

    if (existing) {
      return this.prisma.customer.update({
        where: { id: existing.id },
        data: { ...common, updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined },
      });
    }
    return this.prisma.customer.create({
      data: {
        ...common, id, customerNumber,
        createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
      },
    });
  }

  async upsertExpense(data: any) {
    return this.prisma.expense.upsert({
      where: { id: data.id },
      create: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
        syncStatus: 'synced', syncedAt: new Date(),
      },
      update: {
        ...data,
        syncStatus: 'synced', syncedAt: new Date(),
      },
    });
  }

  async upsertRevenue(data: any) {
    return this.prisma.revenue.upsert({
      where: { id: data.id },
      create: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
        syncStatus: 'synced', syncedAt: new Date(),
      },
      update: {
        ...data,
        syncStatus: 'synced', syncedAt: new Date(),
      },
    });
  }

  async upsertShift(data: any) {
    // FK NOT NULL: registerId (cashRegister), employeeId (employee)
    if (data.registerId) await this.ensureStub('cashRegister', data.registerId, data.tenantId);
    if (data.employeeId) await this.ensureStub('employee', data.employeeId, data.tenantId);

    return this.prisma.shift.upsert({
      where: { id: data.id },
      create: {
        ...data,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        syncStatus: 'synced', syncedAt: new Date(),
      },
      update: {
        ...data,
        syncStatus: 'synced', syncedAt: new Date(),
      },
    });
  }

  async upsertInvoice(data: any) {
    const { items, payments, ...invData } = data;

    // FK nullable mais si présente doit exister
    if (invData.customerId) await this.ensureStub('customer', invData.customerId, invData.tenantId);

    const inv = await this.prisma.invoice.upsert({
      where: { id: invData.id },
      create: {
        ...invData,
        issueDate: invData.issueDate ? new Date(invData.issueDate) : undefined,
        dueDate: invData.dueDate ? new Date(invData.dueDate) : undefined,
        syncStatus: 'synced', syncedAt: new Date(),
      },
      update: {
        ...invData,
        syncStatus: 'synced', syncedAt: new Date(),
      },
    });

    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (item.productId) await this.ensureStub('product', item.productId, invData.tenantId);
        await this.prisma.invoiceItem.upsert({
          where: { id: item.id },
          create: { ...item },
          update: { ...item },
        }).catch(() => {});
      }
    }
    if (payments && Array.isArray(payments)) {
      for (const payment of payments) {
        if (payment.cashierId) await this.ensureStub('employee', payment.cashierId, invData.tenantId);
        await this.prisma.invoicePayment.upsert({
          where: { id: payment.id },
          create: { ...payment },
          update: { ...payment },
        }).catch(() => {});
      }
    }
    return inv;
  }

  async upsertReturn(data: any) {
    const { items, ...retData } = data;

    // FK nullable mais si présente doit exister
    if (retData.originalTransactionId) await this.ensureStub('transaction', retData.originalTransactionId, retData.tenantId);
    if (retData.originalInvoiceId) await this.ensureStub('invoice', retData.originalInvoiceId, retData.tenantId);

    const ret = await this.prisma.productReturn.upsert({
      where: { id: retData.id },
      create: {
        ...retData,
        date: retData.date ? new Date(retData.date) : undefined,
        syncStatus: 'synced', syncedAt: new Date(),
      },
      update: {
        ...retData,
        syncStatus: 'synced', syncedAt: new Date(),
      },
    });

    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (item.productId) await this.ensureStub('product', item.productId, retData.tenantId);
        await this.prisma.returnItem.upsert({
          where: { id: item.id },
          create: { ...item },
          update: { ...item },
        }).catch(() => {});
      }
    }
    return ret;
  }

  async upsertSchedule(data: any) {
    // FK NOT NULL: employeeId, registerId
    if (data.employeeId) await this.ensureStub('employee', data.employeeId, data.tenantId);
    if (data.registerId) await this.ensureStub('cashRegister', data.registerId, data.tenantId);

    return this.prisma.schedule.upsert({
      where: { id: data.id },
      create: {
        ...data,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        syncStatus: 'synced', syncedAt: new Date(),
      },
      update: {
        ...data,
        syncStatus: 'synced', syncedAt: new Date(),
      },
    });
  }

  async upsertLoyaltyHistory(data: any) {
    // FK NOT NULL: customerId
    if (data.customerId) await this.ensureStub('customer', data.customerId, data.tenantId);

    return this.prisma.loyaltyHistory.upsert({
      where: { id: data.id },
      create: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
        syncStatus: 'synced', syncedAt: new Date(),
      },
      update: {
        ...data,
        syncStatus: 'synced', syncedAt: new Date(),
      },
    });
  }

  async upsertStore(data: any) {
    return this.prisma.store.upsert({
      where: { id: data.id },
      create: {
        ...data,
        syncStatus: 'synced', syncedAt: new Date(),
      },
      update: {
        ...data,
        syncStatus: 'synced', syncedAt: new Date(),
      },
    });
  }

  async upsertProductBatch(data: any) {
    // FK NOT NULL: productId
    if (data.productId) await this.ensureStub('product', data.productId, data.tenantId);

    return this.prisma.productBatch.upsert({
      where: { id: data.id },
      create: {
        ...data,
        receivedDate: data.receivedDate ? new Date(data.receivedDate) : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        syncStatus: 'synced', syncedAt: new Date(),
      },
      update: {
        ...data,
        syncStatus: 'synced', syncedAt: new Date(),
      },
    });
  }

  async upsertStockMovement(data: any) {
    // FK NOT NULL: productId
    if (data.productId) await this.ensureStub('product', data.productId, data.tenantId);

    return this.prisma.stockMovement.upsert({
      where: { id: data.id },
      create: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
        syncStatus: 'synced', syncedAt: new Date(),
      },
      update: {
        ...data,
        syncStatus: 'synced', syncedAt: new Date(),
      },
    });
  }

  // REVERSE SYNC: Pull changes from cloud since given timestamp
  // Returns entities that were modified since the given date.
  // Local will upsert these into its own DB.
  // Products are paginated (productsLimit/productsOffset) to avoid loading
  // tens of thousands of rows into memory at once on the mini-PC.
  // Other entities are returned in full (small volumes).
  async pullChanges(since: Date, productsLimit?: number, productsOffset: number = 0) {
    const productArgs: any = {
      where: { updatedAt: { gt: since } },
      select: {
        id: true, sku: true, barcode: true, name: true, description: true,
        category: true, subCategory: true, brand: true,
        price: true, costPrice: true, taxRate: true, wholesalePrice: true,
        packQuantity: true, packBarcode: true,
        markdownPrice: true, markdownReason: true, markdownNote: true,
        markdownStartsAt: true, markdownExpiresAt: true,
        stock: true, minStock: true, maxStock: true, unit: true,
        expiryDate: true, supplierId: true, imageUrl: true, isActive: true,
        tenantId: true, createdAt: true, updatedAt: true,
      },
    };
    if (productsLimit !== undefined) {
      productArgs.take = productsLimit;
      productArgs.skip = productsOffset;
      productArgs.orderBy = { updatedAt: 'asc' };
    }

    const [
      employees,
      products,
      cashRegisters,
      customers,
      suppliers,
      schedules,
      productsTotal,
    ] = await Promise.all([
      this.prisma.employee.findMany({
        where: { updatedAt: { gt: since } },
        select: {
          id: true, employeeNumber: true, firstName: true, lastName: true,
          role: true, department: true, phone: true, email: true,
          hireDate: true, status: true, pin: true, licenseKey: true,
          tenantId: true, createdAt: true, updatedAt: true,
        },
      }).catch(() => []),
      this.prisma.product.findMany(productArgs).catch(() => []),
      this.prisma.cashRegister.findMany({
        where: { updatedAt: { gt: since } },
        select: {
          id: true, name: true, code: true, status: true,
          openingCash: true, currentCash: true, location: true, isActive: true,
          tenantId: true, createdAt: true, updatedAt: true,
        },
      }).catch(() => []),
      this.prisma.customer.findMany({
        where: { updatedAt: { gt: since } },
        select: {
          id: true, customerNumber: true, firstName: true, lastName: true,
          phone: true, email: true, points: true, totalSpent: true,
          tier: true, isActive: true, createdBy: true,
          tenantId: true, createdAt: true, updatedAt: true,
        },
      }).catch(() => []),
      this.prisma.supplier.findMany({
        where: { updatedAt: { gt: since } },
        select: {
          id: true, name: true, contact: true, phone: true, email: true,
          address: true, paymentTerms: true, rating: true, isActive: true,
          licenseKey: true, tenantId: true, createdAt: true, updatedAt: true,
        },
      }).catch(() => []),
      this.prisma.schedule.findMany({
        where: { updatedAt: { gt: since } },
        select: {
          id: true, employeeId: true, registerId: true, dayOfWeek: true,
          startTime: true, endTime: true, breakStart: true, breakEnd: true,
          isActive: true, tenantId: true, notes: true,
          createdAt: true, updatedAt: true,
        },
      }).catch(() => []),
      // Only count when paginating (cheap when limit is set); else undefined
      productsLimit !== undefined
        ? this.prisma.product.count({ where: { updatedAt: { gt: since } } }).catch(() => 0)
        : Promise.resolve(undefined),
    ]);

    const productsHasMore = productsLimit !== undefined
      ? (productsOffset + products.length) < (productsTotal ?? 0)
      : false;

    return {
      since: since.toISOString(),
      pulledAt: new Date().toISOString(),
      counts: {
        employees: employees.length,
        products: products.length,
        cashRegisters: cashRegisters.length,
        customers: customers.length,
        suppliers: suppliers.length,
        schedules: schedules.length,
      },
      // Pagination metadata (only meaningful when productsLimit is set)
      productsTotal: productsTotal ?? null,
      productsOffset,
      productsLimit: productsLimit ?? null,
      productsHasMore,
      employees,
      products,
      cashRegisters,
      customers,
      suppliers,
      schedules,
    };
  }
}
