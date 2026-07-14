import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

// Service exécuté sur le CLOUD pour recevoir les données sync depuis le local
// Utilise upsert pour gérer create + update en un seul appel
@Injectable()
export class CloudSyncService {
  constructor(private prisma: PrismaService) {}

  async upsertProduct(data: any) {
    const {
      id, sku, barcode, name, description, category, subCategory, brand,
      price, costPrice, taxRate, wholesalePrice, packQuantity, packBarcode,
      markdownPrice, markdownReason, markdownNote, markdownStartsAt, markdownExpiresAt,
      stock, minStock, maxStock, unit, expiryDate, supplierId, imageUrl, isActive,
      tenantId,
      createdAt, updatedAt,
    } = data;

    return this.prisma.product.upsert({
      where: { sku },
      create: {
        id, sku, barcode, name, description, category, subCategory, brand,
        price, costPrice, taxRate, wholesalePrice, packQuantity, packBarcode,
        markdownPrice, markdownReason, markdownNote, markdownStartsAt, markdownExpiresAt,
        stock, minStock, maxStock, unit, expiryDate: expiryDate ? new Date(expiryDate) : null,
        supplierId, imageUrl, isActive,
        tenantId: tenantId || null,
        createdAt: createdAt ? new Date(createdAt) : undefined,
        updatedAt: updatedAt ? new Date(updatedAt) : undefined,
        syncStatus: 'synced', syncedAt: new Date(),
      },
      update: {
        barcode, name, description, category, subCategory, brand,
        price, costPrice, taxRate, wholesalePrice, packQuantity, packBarcode,
        markdownPrice, markdownReason, markdownNote, markdownStartsAt, markdownExpiresAt,
        stock, minStock, maxStock, unit, expiryDate: expiryDate ? new Date(expiryDate) : null,
        supplierId, imageUrl, isActive,
        tenantId: tenantId || null,
        updatedAt: updatedAt ? new Date(updatedAt) : undefined,
        syncStatus: 'synced', syncedAt: new Date(),
      },
    });
  }

  async upsertEmployee(data: any) {
    const {
      id, employeeNumber, firstName, lastName, role, department,
      phone, email, hireDate, status, pin, licenseKey, tenantId,
      createdAt, updatedAt,
    } = data;

    // Use employeeNumber as the unique business key to prevent duplicates
    // when the local DB regenerates Prisma IDs
    return this.prisma.employee.upsert({
      where: { employeeNumber },
      create: {
        id, employeeNumber, firstName, lastName, role, department,
        phone, email, hireDate: new Date(hireDate), status, pin, licenseKey,
        tenantId: tenantId || null,
        createdAt: createdAt ? new Date(createdAt) : undefined,
        updatedAt: updatedAt ? new Date(updatedAt) : undefined,
        syncStatus: 'synced', syncedAt: new Date(),
      },
      update: {
        firstName, lastName, role, department,
        phone, email, hireDate: new Date(hireDate), status, pin, licenseKey,
        tenantId: tenantId || null,
        updatedAt: updatedAt ? new Date(updatedAt) : undefined,
        syncStatus: 'synced', syncedAt: new Date(),
      },
    });
  }

  async upsertCashRegister(data: any) {
    const {
      id, name, code, status, openingCash, currentCash,
      location, isActive, tenantId, createdAt, updatedAt,
    } = data;

    return this.prisma.cashRegister.upsert({
      where: { code },
      create: {
        id, name, code, status, openingCash, currentCash,
        location, isActive,
        tenantId: tenantId || null,
        createdAt: createdAt ? new Date(createdAt) : undefined,
        updatedAt: updatedAt ? new Date(updatedAt) : undefined,
        syncStatus: 'synced', syncedAt: new Date(),
      },
      update: {
        name, status, openingCash, currentCash,
        location, isActive,
        tenantId: tenantId || null,
        updatedAt: updatedAt ? new Date(updatedAt) : undefined,
        syncStatus: 'synced', syncedAt: new Date(),
      },
    });
  }

  // Upsert générique pour les entités déjà syncées (transactions, suppliers, etc.)
  // Permet de migrer progressivement le sync existant vers upsert
  async upsertTransaction(data: any) {
    const { items, ...txData } = data;
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
    return this.prisma.customer.upsert({
      where: { customerNumber },
      create: {
        ...rest,
        id, customerNumber,
        createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
        syncStatus: 'synced', syncedAt: new Date(),
      },
      update: {
        ...rest,
        syncStatus: 'synced', syncedAt: new Date(),
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
        await this.prisma.invoiceItem.upsert({
          where: { id: item.id },
          create: { ...item },
          update: { ...item },
        }).catch(() => {});
      }
    }
    if (payments && Array.isArray(payments)) {
      for (const payment of payments) {
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
  // Returns entities that were modified since the given date
  // Local will upsert these into its own DB
  async pullChanges(since: Date) {
    const [
      employees,
      products,
      cashRegisters,
      customers,
      suppliers,
      schedules,
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
      this.prisma.product.findMany({
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
      }).catch(() => []),
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
    ]);

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
      employees,
      products,
      cashRegisters,
      customers,
      suppliers,
      schedules,
    };
  }
}
