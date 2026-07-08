const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const licenseKey = 'KABRAK-STD-2024-EASYSHOP-DEMO01';
  const q = '33 export';

  // Simulate the search endpoint logic
  const andConditions = [{ isActive: true }];
  andConditions.push({ OR: [{ licenseKey }, { licenseKey: null }] });
  andConditions.push({
    OR: [
      { name: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
      { barcode: { contains: q } },
      { description: { contains: q, mode: 'insensitive' } },
    ],
  });

  const results = await prisma.product.findMany({
    where: { AND: andConditions },
    take: 10,
    select: { id: true, name: true, sku: true, barcode: true, licenseKey: true },
  });

  console.log('Search results for "33 export":', results.length);
  console.log(JSON.stringify(results, null, 2));

  // Also test bestsellers (old behavior - no filter)
  const topItems = await prisma.transactionItem.groupBy({
    by: ['productId'],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 200,
  });
  const productIds = topItems.map((t) => t.productId);
  const extra = await prisma.product.findMany({
    where: { isActive: true, id: { notIn: productIds } },
    orderBy: { stock: 'desc' },
    take: 200 - productIds.length,
    select: { id: true },
  });
  productIds.push(...extra.map((p) => p.id));

  const bestsellers = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    select: { id: true, name: true, licenseKey: true },
  });

  const p33InBestsellers = bestsellers.find((p) => p.name && p.name.toLowerCase().includes('33 export'));
  console.log('\n"33 export" in bestsellers (old, unfiltered):', p33InBestsellers ? 'YES' : 'NO');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
