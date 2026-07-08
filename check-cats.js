const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.product.groupBy({
    by: ['category'],
    _count: true,
    orderBy: { _count: { category: 'desc' } },
  });
  console.log(`Total distinct categories: ${categories.length}`);
  categories.forEach(c => console.log(`  "${c.category}" | ${c._count.category}`));
}

main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
