const { PrismaClient } = require('@prisma/client');

const cloudUrl = "postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require";
const localUrl = "postgresql://postgres:postgres@localhost:5432/kabrak_local";

const cloud = new PrismaClient({ datasources: { db: { url: cloudUrl } } });
const local = new PrismaClient({ datasources: { db: { url: localUrl } } });

async function main() {
  // 1. Lire les transactions du 01/07 sur le cloud
  const startDate = new Date('2025-07-01T00:00:00');
  const endDate = new Date('2025-07-02T00:00:00');

  const cloudTx = await cloud.transaction.findMany({
    where: { createdAt: { gte: startDate, lt: endDate } },
    include: { items: true, cashier: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`=== TRANSACTIONS CLOUD 01/07 (${cloudTx.length}) ===`);
  let totalCloud = 0;
  cloudTx.forEach(tx => {
    console.log(`  ${tx.transactionNumber || tx.id} | ${tx.createdAt} | total=${tx.total} | cashier=${tx.cashierId} | items=${tx.items.length}`);
    totalCloud += tx.total;
  });
  console.log(`Total cloud: ${totalCloud}`);

  if (cloudTx.length === 0) {
    console.log('\nAucune transaction sur le cloud pour le 01/07. Verification autres dates...');
    const allTx = await cloud.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, transactionNumber: true, createdAt: true, total: true, cashierId: true },
    });
    console.log('=== DERNIERES TRANSACTIONS CLOUD ===');
    allTx.forEach(tx => console.log(`  ${tx.transactionNumber || tx.id} | ${tx.createdAt} | total=${tx.total} | cashier=${tx.cashierId}`));
    return;
  }

  // 2. Vérifier les employés locaux pour mapper les cashierId
  const localEmployees = await local.employee.findMany();
  console.log(`\n=== EMPLOYES LOCAUX (${localEmployees.length}) ===`);
  localEmployees.forEach(e => console.log(`  ${e.id} | ${e.employeeNumber} | ${e.firstName} ${e.lastName} | role=${e.role}`));

  // 3. Vérifier les employés cloud
  const cloudEmployees = await cloud.employee.findMany();
  console.log(`\n=== EMPLOYES CLOUD (${cloudEmployees.length}) ===`);
  cloudEmployees.forEach(e => console.log(`  ${e.id} | ${e.employeeNumber} | ${e.firstName} ${e.lastName} | role=${e.role}`));

  // 4. Mapping cashierId cloud -> local (par employeeNumber)
  const cashierMap = {};
  for (const ce of cloudEmployees) {
    const le = localEmployees.find(e => e.employeeNumber === ce.employeeNumber);
    if (le) {
      cashierMap[ce.id] = le.id;
      console.log(`  MAP: ${ce.firstName} ${ce.lastName} | cloud=${ce.id} -> local=${le.id}`);
    } else {
      // Fallback: match by role cashier
      const leCashier = localEmployees.find(e => e.role === 'cashier' && e.firstName?.toLowerCase().includes(ce.firstName?.toLowerCase().split(' ')[0]));
      if (leCashier) {
        cashierMap[ce.id] = leCashier.id;
        console.log(`  MAP(fuzzy): ${ce.firstName} ${ce.lastName} | cloud=${ce.id} -> local=${leCashier.id}`);
      } else {
        // Use first local cashier as fallback
        const firstCashier = localEmployees.find(e => e.role === 'cashier');
        if (firstCashier) {
          cashierMap[ce.id] = firstCashier.id;
          console.log(`  MAP(fallback): ${ce.firstName} ${ce.lastName} | cloud=${ce.id} -> local=${firstCashier.id} (first cashier)`);
        }
      }
    }
  }

  // 5. Vérifier quels produits existent localement
  const cloudProductIds = new Set(cloudTx.flatMap(tx => tx.items.map(i => i.productId)));
  console.log(`\nProduits uniques dans les transactions: ${cloudProductIds.size}`);
  
  const localProducts = await local.product.findMany({
    where: { id: { in: [...cloudProductIds] } },
    select: { id: true },
  });
  const localProductIds = new Set(localProducts.map(p => p.id));
  const missingProducts = [...cloudProductIds].filter(id => !localProductIds.has(id));
  console.log(`Produits trouves localement: ${localProductIds.size}/${cloudProductIds.size}`);
  if (missingProducts.length > 0) {
    console.log(`Produits manquants localement: ${missingProducts.length}`);
    // Check if they exist by barcode/sku instead
    for (const pid of missingProducts.slice(0, 5)) {
      const cp = await cloud.product.findUnique({ where: { id: pid }, select: { id: true, name: true, barcode: true, sku: true } });
      console.log(`  Manquant: ${cp?.name} | barcode=${cp?.barcode} | sku=${cp?.sku}`);
    }
  }

  // 6. Importer les transactions
  console.log(`\n=== IMPORTATION ===`);
  let imported = 0;
  let skipped = 0;

  for (const tx of cloudTx) {
    // Vérifier si déjà importée (par transactionNumber ou id cloud)
    const existing = await local.transaction.findFirst({
      where: { transactionNumber: tx.transactionNumber },
    });
    if (existing) {
      console.log(`  SKIP ${tx.transactionNumber} (deja importee)`);
      skipped++;
      continue;
    }

    const localCashierId = cashierMap[tx.cashierId] || tx.cashierId;

    // Créer la transaction locale
    const newTx = await local.transaction.create({
      data: {
        transactionNumber: tx.transactionNumber,
        cashierId: localCashierId,
        subtotal: tx.subtotal,
        discount: tx.discount || 0,
        tax: tx.tax || 0,
        total: tx.total,
        paymentMethod: tx.paymentMethod,
        cashGiven: tx.cashGiven,
        change: tx.change,
        status: tx.status || 'completed',
        date: tx.createdAt,
        createdAt: tx.createdAt,
        updatedAt: tx.createdAt,
        licenseKey: tx.licenseKey,
        registerId: tx.registerId,
        customerId: tx.customerId,
      },
    });

    // Importer les items
    for (const item of tx.items) {
      // Mapper le productId si le produit existe localement, sinon utiliser l'ID cloud
      const useProductId = localProductIds.has(item.productId) ? item.productId : item.productId;
      
      await local.transactionItem.create({
        data: {
          transactionId: newTx.id,
          productId: useProductId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          tax: item.tax || 0,
          total: item.total,
        },
      }).catch(e => console.log(`    Item error: ${e.message}`));
    }

    console.log(`  OK ${tx.transactionNumber} | total=${tx.total} | items=${tx.items.length}`);
    imported++;
  }

  console.log(`\n=== RESULTAT: ${imported} importees, ${skipped} skippees ===`);

  // 7. Vérifier le résultat
  const localTxCount = await local.transaction.count();
  console.log(`Total transactions locales maintenant: ${localTxCount}`);
}

main()
  .catch(e => { console.error('ERREUR:', e.message); process.exit(1); })
  .finally(async () => { await cloud.$disconnect(); await local.$disconnect(); });
