require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const cloud = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require' }
  }
});

const local = new PrismaClient();

(async () => {
  const cloudProds = await cloud.product.findMany({ select: { barcode: true, name: true, sku: true, stock: true, price: true, category: true } });
  const localProds = await local.product.findMany({ select: { barcode: true } });
  const localBarcodes = new Set(localProds.map(p => p.barcode).filter(Boolean));
  
  // Products on cloud but NOT on local = never synced or sync failed
  const stillMissing = cloudProds.filter(p => p.barcode && !localBarcodes.has(p.barcode));
  
  // Products on cloud that ARE on local = successfully synced (including the 169)
  const synced = cloudProds.filter(p => p.barcode && localBarcodes.has(p.barcode));
  
  console.log(`Cloud total: ${cloudProds.length}`);
  console.log(`Local total: ${localProds.length}`);
  console.log(`Synced (on both): ${synced.length}`);
  console.log(`Still missing from local: ${stillMissing.length}`);
  
  if (stillMissing.length > 0) {
    console.log('\n=== PRODUITS MANQUANTS (cloud mais pas local) ===');
    stillMissing.forEach((p, i) => console.log(`${i+1}. ${p.barcode} | ${p.name} | ${p.category} | stock:${p.stock} | ${p.price} FCFA`));
  }
  
  console.log('\n=== TOUS LES PRODUITS CLOUD ===');
  cloudProds.sort((a, b) => a.name.localeCompare(b.name));
  cloudProds.forEach((p, i) => {
    const onLocal = localBarcodes.has(p.barcode) ? 'OK' : 'MISSING';
    console.log(`${i+1}. [${onLocal}] ${p.barcode} | ${p.name} | ${p.category} | stock:${p.stock} | ${p.price} FCFA`);
  });
  
  await cloud.$disconnect();
  await local.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
