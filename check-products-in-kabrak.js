const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const noms = [
    'BIC MINI',
    'VASELINE COCOA RADIANT',
    'COLGATE CHARCOAL',
    'COLGATE EXTRA CLEAN',
    'DETTTOL-POMMEGRANATE',
    'MATINAL-CHOCLATE DRINK',
    'ARMANTI-MAYONNAISE',
    'NESTLE NIDO',
    'NUTS ASSORTED',
    'OVALTINE -POUCH',
    'KD CORN FLAKES',
    'TOPRANK GLUE BOARD',
    'BROLI MILK POWDER',
    'SWEET ASSORTED',
  ];

  console.log('=== VERIFICATION PRODUITS DANS KABRAK ===\n');
  let found = 0;
  let notFound = 0;

  for (const nom of noms) {
    const products = await prisma.product.findMany({
      where: { name: { contains: nom, mode: 'insensitive' } },
      select: { name: true, barcode: true, price: true, stock: true, category: true },
      take: 1,
    });

    if (products.length > 0) {
      const p = products[0];
      const snom = p.name.substring(0, 35);
      console.log(`  TROUVE  | ${snom.padEnd(35)} | ${p.price} FCFA | stock: ${p.stock} | ${p.category}`);
      found++;
    } else {
      console.log(`  ABSENT  | ${nom}`);
      notFound++;
    }
  }

  console.log(`\nResultat: ${found} trouves / ${notFound} absents sur ${noms.length} produits`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
