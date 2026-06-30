const { PrismaClient } = require('@prisma/client');
// Utiliser la DB locale explicitement
const p = new PrismaClient({
  datasources: { db: { url: 'postgresql://postgres:postgres@localhost:5432/kabrak_local' } }
});
async function main() {
  const prodCount = await p.product.count();
  const sample = await p.product.findMany({ take: 3, select: { name: true, barcode: true, licenseKey: true } });
  console.log('LOCAL DB - PRODUCTS total:', prodCount);
  console.log('Sample:', JSON.stringify(sample, null, 2));
}
main().catch(console.error).finally(() => p.$disconnect());
