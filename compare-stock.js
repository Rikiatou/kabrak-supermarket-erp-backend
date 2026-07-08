const { PrismaClient } = require('@prisma/client');

const cloudUrl = 'postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const localPrisma = new PrismaClient();
const cloudPrisma = new PrismaClient({ datasources: { db: { url: cloudUrl } } });

async function main() {
  console.log('Counting zero-stock products...');
  const localZero = await localPrisma.product.count({ where: { stock: 0 } });
  const cloudZero = await cloudPrisma.product.count({ where: { stock: 0 } });
  console.log('Local zero-stock:', localZero);
  console.log('Cloud zero-stock:', cloudZero);

  console.log('\nCounting low-stock (stock <= 5)...');
  const localLow = await localPrisma.product.count({ where: { stock: { lte: 5 } } });
  const cloudLow = await cloudPrisma.product.count({ where: { stock: { lte: 5 } } });
  console.log('Local low-stock:', localLow);
  console.log('Cloud low-stock:', cloudLow);

  console.log('\nTotal stock sum...');
  const localSum = await localPrisma.product.aggregate({ _sum: { stock: true } });
  const cloudSum = await cloudPrisma.product.aggregate({ _sum: { stock: true } });
  console.log('Local total stock:', localSum._sum.stock);
  console.log('Cloud total stock:', cloudSum._sum.stock);
}

main().then(() => { localPrisma.$disconnect(); cloudPrisma.$disconnect(); process.exit(0); }).catch(e => { console.error(e.message); process.exit(1); });
