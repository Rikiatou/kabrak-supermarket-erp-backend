/**
 * Export des ventes du 01/07/2026 depuis le serveur local → cloud
 * A lancer SUR LE SERVEUR CLIENT (via AnyDesk)
 * 
 * Usage: node export-sales-to-cloud.js
 */
const { PrismaClient } = require('@prisma/client');

// Local = la DB du serveur client (définie dans .env)
const local = new PrismaClient();

// Cloud = Neon
const cloudUrl = "postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require";
const cloud = new PrismaClient({ datasources: { db: { url: cloudUrl } } });

async function main() {
  const startDate = new Date('2025-07-01T00:00:00');
  const endDate = new Date('2025-07-02T00:00:00');

  // 1. Lire les ventes du 01/07 sur le serveur local
  console.log('=== LECTURE VENTES 01/07 SERVEUR LOCAL ===');
  const txs = await local.transaction.findMany({
    where: { 
      OR: [
        { createdAt: { gte: startDate, lt: endDate } },
        { date: { gte: startDate, lt: endDate } },
      ]
    },
    include: { items: true, cashier: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Transactions trouvees: ${txs.length}`);
  if (txs.length === 0) {
    console.log('Aucune vente pour le 01/07. Verification des dernieres ventes...');
    const recent = await local.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, transactionNumber: true, createdAt: true, date: true, total: true },
    });
    console.log('Dernieres transactions locales:');
    recent.forEach(t => console.log(`  ${t.transactionNumber || t.id} | createdAt=${t.createdAt} | date=${t.date} | total=${t.total}`));
    return;
  }

  let totalLocal = 0;
  txs.forEach(tx => {
    console.log(`  ${tx.transactionNumber || tx.id} | ${tx.createdAt} | total=${tx.total} | cashier=${tx.cashier?.firstName} ${tx.cashier?.lastName} | items=${tx.items.length}`);
    totalLocal += tx.total;
  });
  console.log(`Total: ${totalLocal} FCFA\n`);

  // 2. Mapper les employés local → cloud
  console.log('=== MAPPING EMPLOYES ===');
  const localEmps = await local.employee.findMany();
  const cloudEmps = await cloud.employee.findMany();
  const empMap = {};

  for (const le of localEmps) {
    // Match par employeeNumber
    const ce = cloudEmps.find(e => e.employeeNumber === le.employeeNumber);
    if (ce) {
      empMap[le.id] = ce.id;
      console.log(`  ${le.firstName} ${le.lastName}: local=${le.id} -> cloud=${ce.id}`);
    } else {
      // Match fuzzy par prénom
      const firstName = (le.firstName || '').split(' ')[0].toLowerCase();
      const ceFuzzy = cloudEmps.find(e => 
        (e.firstName || '').toLowerCase().includes(firstName) ||
        firstName.includes((e.firstName || '').toLowerCase().split(' ')[0])
      );
      if (ceFuzzy) {
        empMap[le.id] = ceFuzzy.id;
        console.log(`  ${le.firstName} ${le.lastName}: local=${le.id} -> cloud=${ceFuzzy.id} (fuzzy)`);
      } else {
        // Fallback: premier cashier du cloud
        const cloudCashier = cloudEmps.find(e => e.role === 'cashier');
        if (cloudCashier) {
          empMap[le.id] = cloudCashier.id;
          console.log(`  ${le.firstName} ${le.lastName}: local=${le.id} -> cloud=${cloudCashier.id} (fallback cashier)`);
        }
      }
    }
  }

  // 3. Mapper les produits local → cloud
  console.log('\n=== MAPPING PRODUITS ===');
  const localProductIds = new Set(txs.flatMap(t => t.items.map(i => i.productId)));
  const localProducts = await local.product.findMany({
    where: { id: { in: [...localProductIds] } },
    select: { id: true, name: true, barcode: true, sku: true },
  });
  
  const cloudProducts = await cloud.product.findMany({
    select: { id: true, name: true, barcode: true, sku: true },
  });

  const productMap = {};
  let matched = 0;
  for (const lp of localProducts) {
    // Match par barcode d'abord
    if (lp.barcode) {
      const cp = cloudProducts.find(p => p.barcode === lp.barcode);
      if (cp) { productMap[lp.id] = cp.id; matched++; continue; }
    }
    // Match par SKU
    if (lp.sku) {
      const cp = cloudProducts.find(p => p.sku === lp.sku);
      if (cp) { productMap[lp.id] = cp.id; matched++; continue; }
    }
    // Match par nom exact
    const cp = cloudProducts.find(p => p.name === lp.name);
    if (cp) { productMap[lp.id] = cp.id; matched++; continue; }
  }
  console.log(`Produits mappes: ${matched}/${localProductIds.size}`);

  // 4. Importer vers le cloud
  console.log('\n=== IMPORTATION VERS CLOUD ===');
  let imported = 0;
  let skipped = 0;

  for (const tx of txs) {
    // Vérifier si déjà importée
    const existing = await cloud.transaction.findFirst({
      where: { transactionNumber: tx.transactionNumber },
    });
    if (existing) {
      console.log(`  SKIP ${tx.transactionNumber} (deja dans cloud)`);
      skipped++;
      continue;
    }

    const cloudCashierId = empMap[tx.cashierId] || tx.cashierId;

    const newTx = await cloud.transaction.create({
      data: {
        transactionNumber: tx.transactionNumber,
        cashierId: cloudCashierId,
        subtotal: tx.subtotal,
        discount: tx.discount || 0,
        tax: tx.tax || 0,
        total: tx.total,
        paymentMethod: tx.paymentMethod,
        cashGiven: tx.cashGiven,
        change: tx.change,
        status: tx.status || 'completed',
        date: tx.date || tx.createdAt,
        createdAt: tx.createdAt,
        updatedAt: tx.createdAt,
        licenseKey: tx.licenseKey,
        registerId: tx.registerId,
        customerId: tx.customerId,
      },
    });

    for (const item of tx.items) {
      const cloudProductId = productMap[item.productId] || item.productId;
      await cloud.transactionItem.create({
        data: {
          transactionId: newTx.id,
          productId: cloudProductId,
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

  console.log(`\n=== RESULTAT ===`);
  console.log(`Importees: ${imported}`);
  console.log(`Skippees (deja presentes): ${skipped}`);
  console.log(`Total transfere: ${totalLocal} FCFA`);

  // 5. Vérifier le cloud
  const cloudCount = await cloud.transaction.count();
  console.log(`Total transactions cloud maintenant: ${cloudCount}`);
}

main()
  .catch(e => { console.error('ERREUR:', e.message); process.exit(1); })
  .finally(async () => { await local.$disconnect(); await cloud.$disconnect(); });
