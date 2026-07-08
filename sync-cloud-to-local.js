/**
 * Sync CLOUD → LOCAL (one-time)
 * - Importe les 13 ventes du 30 juin
 * - Importe les 7 shifts
 * - Importe les produits manquants
 * - Mappe les employés cloud vers local
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
  console.log('=== SYNC CLOUD → LOCAL ===\n');

  // 1. Mapper employés cloud → local (par firstName)
  const cloudEmps = await cloud.employee.findMany();
  const localEmps = await local.employee.findMany();
  const empMap = {}; // cloudId → localId

  console.log('--- Mapping employés ---');
  for (const ce of cloudEmps) {
    const firstName = ce.firstName.split(' ')[0].toUpperCase();
    const localEmp = localEmps.find(
      (le) => le.firstName.toUpperCase().includes(firstName) || le.firstName.toUpperCase() === firstName
    );
    if (localEmp) {
      empMap[ce.id] = localEmp.id;
      console.log(`  ${ce.firstName} ${ce.lastName} (${ce.employeeNumber}) → ${localEmp.employeeNumber} (local)`);
    } else {
      console.log(`  ! Pas de match pour ${ce.firstName} ${ce.lastName} (${ce.employeeNumber})`);
    }
  }

  // 2. Sync produits manquants
  console.log('\n--- Sync produits ---');
  const localBarcodes = (await local.product.findMany({ select: { barcode: true } }))
    .map((p) => p.barcode)
    .filter(Boolean);
  const cloudProducts = await cloud.product.findMany();
  const missing = cloudProducts.filter((p) => p.barcode && !localBarcodes.includes(p.barcode));
  console.log(`  Local: ${await local.product.count()} | Cloud: ${cloudProducts.length} | Manquants: ${missing.length}`);

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
          unit: p.unit,
          price: p.price,
          cost: p.cost,
          stock: p.stock,
          minStock: p.minStock,
          maxStock: p.maxStock,
          reorderPoint: p.reorderPoint,
          licenseKey: p.licenseKey,
          isActive: p.isActive ?? true,
        },
      });
      imported++;
    } catch (e) {
      // Skip duplicates
    }
  }
  console.log(`  + ${imported} produits importés`);

  // 3. Sync shifts
  console.log('\n--- Sync shifts ---');
  const cloudShifts = await cloud.shift.findMany();
  console.log(`  ${cloudShifts.length} shifts à importer`);

  // Get a local register
  let localRegister = await local.cashRegister.findFirst();
  if (!localRegister) {
    // Create a default register
    localRegister = await local.cashRegister.create({
      data: { name: 'Caisse 1', location: 'Main' },
    });
  }

  for (const s of cloudShifts) {
    const localEmpId = empMap[s.employeeId] || localEmps.find((e) => e.role === 'cashier')?.id;
    try {
      await local.shift.create({
        data: {
          registerId: localRegister.id,
          registerName: s.registerName || 'Caisse 1',
          employeeId: localEmpId,
          employeeName: s.employeeName,
          openedAt: s.openedAt,
          closedAt: s.closedAt,
          openingCash: s.openingCash,
          closingCash: s.closingCash,
          expectedCash: s.expectedCash,
          difference: s.difference,
          status: s.status || (s.closedAt ? 'closed' : 'open'),
          notes: s.notes,
        },
      });
      console.log(`  + Shift: ${s.employeeName} | ${s.openedAt?.toISOString().substring(0, 16)} → ${s.closedAt?.toISOString().substring(0, 16) || 'OPEN'}`);
    } catch (e) {
      console.log(`  ! Skip shift: ${e.message.substring(0, 80)}`);
    }
  }

  // 4. Sync transactions (ventes)
  console.log('\n--- Sync transactions ---');
  const cloudTxs = await cloud.transaction.findMany({
    include: { items: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`  ${cloudTxs.length} transactions à importer`);

  for (const tx of cloudTxs) {
    const localCashierId = empMap[tx.cashierId] || localEmps.find((e) => e.role === 'cashier')?.id;

    // Check if already imported (by transactionNumber)
    const existing = await local.transaction.findUnique({ where: { transactionNumber: tx.transactionNumber } });
    if (existing) {
      console.log(`  ! Skip (existe déjà): ${tx.transactionNumber}`);
      continue;
    }

    try {
      await local.transaction.create({
        data: {
          transactionNumber: tx.transactionNumber,
          date: tx.date,
          cashierId: localCashierId,
          registerId: tx.registerId || localRegister.id,
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
          items: {
            create: tx.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              discount: i.discount || 0,
              tax: i.tax,
              total: i.total,
            })),
          },
        },
      });
      console.log(`  + TX: ${tx.transactionNumber} | total: ${tx.total} | ${tx.createdAt?.toISOString().substring(0, 16)}`);
    } catch (e) {
      console.log(`  ! Skip TX: ${tx.transactionNumber} → ${e.message.substring(0, 100)}`);
    }
  }

  // 5. Final counts
  console.log('\n=== FINAL ===');
  console.log(`  Employés: ${await local.employee.count()}`);
  console.log(`  Produits: ${await local.product.count()}`);
  console.log(`  Transactions: ${await local.transaction.count()}`);
  console.log(`  Shifts: ${await local.shift.count()}`);

  console.log('\n--- Employés locaux ---');
  const finalEmps = await local.employee.findMany({ select: { employeeNumber: true, pin: true, firstName: true, lastName: true, role: true } });
  finalEmps.forEach((e) => console.log(`  ${e.employeeNumber} | PIN: ${e.pin} | ${e.firstName} ${e.lastName} | ${e.role}`));

  process.exit(0);
})().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
