/**
 * Sync CLOUD → LOCAL v2
 * - Importe les 172 produits manquants (mapping cost→costPrice)
 * - Importe les 13 ventes (mapping productId par barcode)
 * - Shifts déjà importés
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
  console.log('=== SYNC CLOUD → LOCAL v2 ===\n');

  // 1. Mapping employés cloud → local
  const cloudEmps = await cloud.employee.findMany();
  const localEmps = await local.employee.findMany();
  const empMap = {};
  for (const ce of cloudEmps) {
    const firstName = ce.firstName.split(' ')[0].toUpperCase();
    const localEmp = localEmps.find(
      (le) => le.firstName.toUpperCase().includes(firstName)
    );
    if (localEmp) empMap[ce.id] = localEmp.id;
  }
  console.log('Employé map:', Object.keys(empMap).length, 'mappings');

  // 2. Importer produits manquants
  console.log('\n--- Import produits ---');
  const localBarcodes = (await local.product.findMany({ select: { barcode: true } }))
    .map((p) => p.barcode)
    .filter(Boolean);
  const cloudProducts = await cloud.product.findMany();
  const missing = cloudProducts.filter((p) => p.barcode && !localBarcodes.includes(p.barcode));
  console.log(`Manquants: ${missing.length}`);

  let imported = 0;
  for (const p of missing) {
    try {
      await local.product.create({
        data: {
          name: p.name,
          barcode: p.barcode,
          sku: p.sku,
          description: p.description,
          category: p.category,
          subCategory: p.subCategory || null,
          brand: p.brand || null,
          unit: p.unit,
          price: p.price,
          costPrice: p.cost ?? p.costPrice ?? 0, // mapping cost → costPrice
          taxRate: p.taxRate ?? 15.5,
          stock: p.stock ?? 0,
          minStock: p.minStock ?? 10,
          maxStock: p.maxStock ?? null,
          reorderPoint: p.reorderPoint ?? null,
          licenseKey: p.licenseKey,
          isActive: p.isActive ?? true,
        },
      });
      imported++;
    } catch (e) {
      // Skip
    }
  }
  console.log(`+ ${imported} produits importés`);

  // 3. Construire le mapping productId cloud → local (par barcode)
  console.log('\n--- Mapping productIds ---');
  const allCloudProds = await cloud.product.findMany({ select: { id: true, barcode: true } });
  const allLocalProds = await local.product.findMany({ select: { id: true, barcode: true } });
  const prodMap = {};
  let mapped = 0;
  for (const cp of allCloudProds) {
    const lp = allLocalProds.find((lp) => lp.barcode === cp.barcode);
    if (lp) {
      prodMap[cp.id] = lp.id;
      mapped++;
    }
  }
  console.log(`${mapped}/${allCloudProds.length} produits mappés`);

  // 4. Importer transactions
  console.log('\n--- Import transactions ---');
  const cloudTxs = await cloud.transaction.findMany({
    include: { items: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`${cloudTxs.length} transactions à importer`);

  let localRegister = await local.cashRegister.findFirst();

  let txImported = 0;
  for (const tx of cloudTxs) {
    const existing = await local.transaction.findUnique({ where: { transactionNumber: tx.transactionNumber } });
    if (existing) {
      console.log(`  ! Skip (existe): ${tx.transactionNumber}`);
      continue;
    }

    const localCashierId = empMap[tx.cashierId] || localEmps.find((e) => e.role === 'cashier')?.id;

    // Mapper les items: productId cloud → local
    const mappedItems = tx.items.map((i) => {
      const localProductId = prodMap[i.productId];
      if (!localProductId) {
        console.log(`  ! Product not found in local: ${i.productId}`);
      }
      return {
        productId: localProductId || i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount || 0,
        tax: i.tax,
        total: i.total,
      };
    }).filter(i => i.productId); // Skip items with no product

    try {
      await local.transaction.create({
        data: {
          transactionNumber: tx.transactionNumber,
          date: tx.date,
          cashierId: localCashierId,
          registerId: tx.registerId || localRegister?.id || 'default',
          subtotal: tx.subtotal,
          discount: tx.discount || 0,
          tax: tx.tax,
          total: tx.total,
          paymentMethod: tx.paymentMethod,
          cashGiven: tx.cashGiven,
          change: tx.change,
          customerId: tx.customerId || null,
          status: tx.status || 'completed',
          syncStatus: 'synced',
          syncedAt: new Date(),
          licenseKey: tx.licenseKey,
          createdAt: tx.createdAt,
          items: { create: mappedItems },
        },
      });
      txImported++;
      console.log(`  + ${tx.transactionNumber} | total: ${tx.total} | ${tx.createdAt?.toISOString().substring(0, 16)}`);
    } catch (e) {
      console.log(`  ! Skip TX ${tx.transactionNumber}: ${e.message.substring(0, 120)}`);
    }
  }
  console.log(`+ ${txImported} transactions importées`);

  // 5. Final
  console.log('\n=== FINAL ===');
  console.log(`  Employés: ${await local.employee.count()}`);
  console.log(`  Produits: ${await local.product.count()}`);
  console.log(`  Transactions: ${await local.transaction.count()}`);
  console.log(`  Shifts: ${await local.shift.count()}`);

  process.exit(0);
})().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
