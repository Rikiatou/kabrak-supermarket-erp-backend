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
      where: { id },
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
        sku, barcode, name, description, category, subCategory, brand,
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

    return this.prisma.employee.upsert({
      where: { id },
      create: {
        id, employeeNumber, firstName, lastName, role, department,
        phone, email, hireDate: new Date(hireDate), status, pin, licenseKey,
        tenantId: tenantId || null,
        createdAt: createdAt ? new Date(createdAt) : undefined,
        updatedAt: updatedAt ? new Date(updatedAt) : undefined,
        syncStatus: 'synced', syncedAt: new Date(),
      },
      update: {
        employeeNumber, firstName, lastName, role, department,
        phone, email, hireDate: new Date(hireDate), status, pin, licenseKey,
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
      where: { id },
      create: {
        id, name, code, status, openingCash, currentCash,
        location, isActive,
        tenantId: tenantId || null,
        createdAt: createdAt ? new Date(createdAt) : undefined,
        updatedAt: updatedAt ? new Date(updatedAt) : undefined,
        syncStatus: 'synced', syncedAt: new Date(),
      },
      update: {
        name, code, status, openingCash, currentCash,
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
    return this.prisma.customer.upsert({
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
}
