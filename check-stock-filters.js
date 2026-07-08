const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check categories in DB
  const categories = await prisma.product.groupBy({
    by: ['category'],
    _count: true,
    orderBy: { _count: { category: 'desc' } },
  });
  console.log('=== CATEGORIES IN DB ===');
  categories.forEach(c => console.log(`  "${c.category}" | ${c._count.category} products`));

  // Check stock status distribution
  const total = await prisma.product.count({ where: { isActive: true } });
  const outOfStock = await prisma.product.count({ where: { isActive: true, stock: 0 } });
  const lowStock = await prisma.product.count({ where: { isActive: true, stock: { lte: 5, gt: 0 } } });
  const okStock = await prisma.product.count({ where: { isActive: true, stock: { gt: 5 } } });
  console.log(`\n=== STOCK STATUS ===`);
  console.log(`  Total: ${total}`);
  console.log(`  Out of stock (stock=0): ${outOfStock}`);
  console.log(`  Low (stock 1-5): ${lowStock}`);
  console.log(`  OK (stock>5): ${okStock}`);

  // Check minStock values
  const minStockStats = await prisma.product.aggregate({
    where: { isActive: true },
    _min: { minStock: true },
    _max: { minStock: true },
    _avg: { minStock: true },
  });
  console.log(`\n=== MIN STOCK ===`);
  console.log(`  Min: ${minStockStats._min.minStock}, Max: ${minStockStats._max.minStock}, Avg: ${minStockStats._avg.minStock}`);

  // Sample products with low stock
  const lowProducts = await prisma.product.findMany({
    where: { isActive: true, stock: { lte: 5 } },
    take: 5,
    select: { name: true, stock: true, minStock: true, category: true },
  });
  console.log(`\n=== SAMPLE LOW STOCK PRODUCTS ===`);
  lowProducts.forEach(p => console.log(`  ${p.name} | stock=${p.stock} | minStock=${p.minStock} | cat=${p.category}`));
}

main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
