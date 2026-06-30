const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const licenses = await p.license.findMany({ select: { licenseKey: true, clientName: true, status: true } });
  console.log('LICENSES:', JSON.stringify(licenses, null, 2));
  const prodCount = await p.product.count();
  const prodWithKey = await p.product.count({ where: { licenseKey: { not: null } } });
  const prodNull = await p.product.count({ where: { licenseKey: null } });
  console.log('PRODUCTS total:', prodCount, '| with licenseKey:', prodWithKey, '| licenseKey=null:', prodNull);
}
main().catch(console.error).finally(() => p.$disconnect());
