/**
 * Sync produits Cloud (Neon) → Local
 * Copie les produits du cloud qui n'existent pas encore en local.
 * 
 * Usage: node sync-products-from-cloud.js
 * A lancer SUR LE SERVEUR CLIENT ou sur ton PC dev
 */
const { PrismaClient } = require('@prisma/client');

// Cloud = Neon
const cloudUrl = "postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require";
const cloud = new PrismaClient({ datasources: { db: { url: cloudUrl } } });

// Local = la DB du serveur client (définie dans .env)
const local = new PrismaClient();

async function main() {
  console.log('=== SYNC PRODUITS: CLOUD → LOCAL ===\n');

  // 1. Lire tous les produits du cloud
  const cloudProducts = await cloud.product.findMany({
    orderBy: { createdAt: 'desc' },
  });
  console.log(`Produits sur le cloud: ${cloudProducts.length}`);

  // 2. Lire tous les produits locaux
  const localProducts = await local.product.findMany({
    select: { id: true, name: true, barcode: true, sku: true },
  });
  console.log(`Produits en local: ${localProducts.length}`);

  // 3. Trouver les produits cloud qui n'existent pas en local
  const localBarcodes = new Set(localProducts.filter(p => p.barcode).map(p => p.barcode));
  const localSkus = new Set(localProducts.filter(p => p.sku).map(p => p.sku));
  const localNames = new Set(localProducts.map(p => p.name.toLowerCase().trim()));

  const newProducts = cloudProducts.filter(cp => {
    // Skip si barcode existe déjà en local
    if (cp.barcode && localBarcodes.has(cp.barcode)) return false;
    // Skip si SKU existe déjà en local
    if (cp.sku && localSkus.has(cp.sku)) return false;
    // Skip si nom exact existe déjà en local
    if (localNames.has(cp.name.toLowerCase().trim())) return false;
    return true;
  });

  console.log(`\nNouveaux produits a importer: ${newProducts.length}\n`);

  if (newProducts.length === 0) {
    console.log('Tout est deja synchronise !');
    return;
  }

  // 4. Importer les nouveaux produits en local
  let imported = 0;
  let errors = 0;

  for (const product of newProducts) {
    try {
      // Ne pas copier l'ID (le local va en générer un nouveau)
      const { id, createdAt, updatedAt, ...productData } = product;
      
      await local.product.create({
        data: {
          ...productData,
          createdAt: createdAt || new Date(),
          updatedAt: updatedAt || new Date(),
        },
      });
      imported++;
      console.log(`  + ${product.name} (barcode: ${product.barcode || 'N/A'}) - IMPORTE`);
    } catch (err) {
      errors++;
      console.log(`  ! ${product.name} - ERREUR: ${err.message.substring(0, 80)}`);
    }
  }

  console.log(`\n=== RESULTAT ===`);
  console.log(`Importes: ${imported}`);
  console.log(`Erreurs: ${errors}`);
  console.log(`Total produits locaux maintenant: ${localProducts.length + imported}`);
}

main()
  .catch(e => { console.error('ERREUR:', e.message); process.exit(1); })
  .finally(async () => {
    await cloud.$disconnect();
    await local.$disconnect();
  });
