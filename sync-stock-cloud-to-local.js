/**
 * Sync stock + purchase orders du CLOUD → LOCAL
 * Les actions de RITA (et autres) faites aujourd'hui sur le cloud
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const local = new PrismaClient();
const cloud = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    },
  },
});

(async () => {
  console.log('=== SYNC STOCK CLOUD → LOCAL ===\n');

  // 1. Sync product stock levels (cloud → local) for products updated today
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cloudUpdated = await cloud.product.findMany({
    where: { updatedAt: { gte: today } },
    select: { id: true, name: true, barcode: true, stock: true, price: true, costPrice: true, updatedAt: true },
  });
  console.log(`Produits modifies sur cloud aujourdhui: ${cloudUpdated.length}`);

  let updated = 0, notFound = 0;
  for (const cp of cloudUpdated) {
    const lp = await local.product.findFirst({ where: { barcode: cp.barcode } });
    if (lp) {
      if (lp.stock !== cp.stock) {
        await local.product.update({
          where: { id: lp.id },
          data: { stock: cp.stock, price: cp.price },
        });
        console.log(`  + ${cp.name} | stock: ${lp.stock} → ${cp.stock} | prix: ${cp.price}`);
      }
      updated++;
    } else {
      // Product doesn't exist in local - create it
      try {
        await local.product.create({
          data: {
            name: cp.name, barcode: cp.barcode,
            sku: cp.barcode + '-NEW',
            category: 'GENERAL', unit: 'pièce',
            price: cp.price, costPrice: cp.costPrice ?? 0,
            stock: cp.stock, minStock: 10,
            licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
            isActive: true,
          },
        });
        console.log(`  + NOUVEAU: ${cp.name} | stock: ${cp.stock}`);
        updated++;
      } catch (e) {
        console.log(`  ! ${cp.name}: ${e.message.substring(0, 60)}`);
        notFound++;
      }
    }
  }
  console.log(`\n${updated} produits sync, ${notFound} non trouves`);

  // 2. Sync stock movements
  console.log('\n=== MOUVEMENTS DE STOCK ===');
  const cloudMvts = await cloud.stockMovement.findMany({
    where: { createdAt: { gte: today } },
    select: { productId: true, type: true, quantity: true, reason: true, reference: true, createdBy: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Mouvements a sync: ${cloudMvts.length}`);

  // Map RITA cloud id → local id
  const ritaLocal = await local.employee.findFirst({ where: { firstName: { contains: 'RITA' } } });
  const ritaCloud = await cloud.employee.findFirst({ where: { firstName: { contains: 'RITA' } } });

  for (const m of cloudMvts) {
    const cloudProd = await cloud.product.findUnique({ where: { id: m.productId }, select: { barcode: true } });
    const localProd = cloudProd ? await local.product.findFirst({ where: { barcode: cloudProd.barcode } }) : null;
    if (!localProd) { console.log(`  ! Product not found for movement`); continue; }

    // Check if already exists
    const existing = await local.stockMovement.findFirst({
      where: { productId: localProd.id, quantity: m.quantity, reason: m.reason, createdAt: m.createdAt },
    });
    if (existing) { continue; }

    try {
      await local.stockMovement.create({
        data: {
          productId: localProd.id,
          type: m.type,
          quantity: m.quantity,
          reason: m.reason,
          reference: m.reference,
          createdBy: ritaLocal?.id,
          syncStatus: 'synced',
        },
      });
      console.log(`  + ${m.type} ${m.quantity} | ${cloudProd.barcode}`);
    } catch (e) {
      console.log(`  ! Error: ${e.message.substring(0, 60)}`);
    }
  }

  // 3. Sync purchase orders
  console.log('\n=== BONS DE COMMANDE ===');
  const cloudPOs = await cloud.purchaseOrder.findMany({
    where: { createdAt: { gte: today } },
    include: { items: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Bons de commande: ${cloudPOs.length}`);

  for (const po of cloudPOs) {
    // Check if already exists by id
    const existing = await local.purchaseOrder.findUnique({ where: { id: po.id } }).catch(() => null);
    if (existing) { console.log(`  ! Skip (existe): ${po.id}`); continue; }

    try {
      // Map items productId
      const mappedItems = [];
      for (const item of po.items) {
        const cloudProd = await cloud.product.findUnique({ where: { id: item.productId }, select: { barcode: true } });
        const localProd = cloudProd ? await local.product.findFirst({ where: { barcode: cloudProd.barcode } }) : null;
        if (localProd) {
          mappedItems.push({
            productId: localProd.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          });
        }
      }

      await local.purchaseOrder.create({
        data: {
          id: po.id,
          orderNumber: po.orderNumber,
          supplierId: po.supplierId,
          status: po.status,
          date: po.date,
          expectedDate: po.expectedDate,
          receivedDate: po.receivedDate,
          total: po.total,
          notes: po.notes,
          licenseKey: po.licenseKey,
          createdAt: po.createdAt,
          items: { create: mappedItems },
        },
      });
      console.log(`  + PO ${po.orderNumber} | total: ${po.total} | status: ${po.status}`);
    } catch (e) {
      console.log(`  ! Error: ${e.message.substring(0, 100)}`);
    }
  }

  // Final
  console.log('\n=== FINAL ===');
  console.log(`  Produits locaux: ${await local.product.count()}`);
  console.log(`  Mouvements stock: ${await local.stockMovement.count()}`);
  console.log(`  Bons de commande: ${await local.purchaseOrder.count()}`);

  process.exit(0);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
