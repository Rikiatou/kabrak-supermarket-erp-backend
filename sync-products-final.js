/**
 * Import final des 172 produits manquants (SKU conflict → suffix -C)
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
  const localBarcodes = (await local.product.findMany({ select: { barcode: true } }))
    .map((p) => p.barcode).filter(Boolean);
  const localSkus = (await local.product.findMany({ select: { sku: true } }))
    .map((p) => p.sku).filter(Boolean);
  const cloudProducts = await cloud.product.findMany();
  const missing = cloudProducts.filter((p) => p.barcode && !localBarcodes.includes(p.barcode));
  console.log(`Manquants: ${missing.length}`);

  let imported = 0, skipped = 0;
  for (const p of missing) {
    let sku = p.sku;
    if (localSkus.includes(sku)) sku = sku + '-C';
    // Ensure unique even after suffix
    let counter = 1;
    while (localSkus.includes(sku)) { sku = p.sku + '-C' + counter++; }
    localSkus.push(sku);

    try {
      await local.product.create({
        data: {
          name: p.name, barcode: p.barcode, sku,
          description: p.description, category: p.category,
          subCategory: p.subCategory || null, brand: p.brand || null,
          unit: p.unit, price: p.price,
          costPrice: p.cost ?? p.costPrice ?? 0,
          taxRate: p.taxRate ?? 15.5,
          stock: p.stock ?? 0, minStock: p.minStock ?? 10,
          maxStock: p.maxStock ?? null,
          licenseKey: p.licenseKey, isActive: p.isActive ?? true,
        },
      });
      imported++;
    } catch (e) {
      skipped++;
    }
  }
  console.log(`+ ${imported} importés, ${skipped} ignorés`);
  console.log(`Total local products: ${await local.product.count()}`);
  process.exit(0);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
