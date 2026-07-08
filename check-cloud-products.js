const { PrismaClient } = require('@prisma/client');

const cloudUrl = 'postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const prisma = new PrismaClient({
  datasources: { db: { url: cloudUrl } }
});

async function main() {
  const count = await prisma.product.count();
  console.log('Products in cloud (Neon):', count);

  const sample = await prisma.product.findMany({ take: 3, select: { id: true, name: true, barcode: true, price: true, stock: true } });
  console.log('Sample:', JSON.stringify(sample, null, 2));

  const employees = await prisma.employee.count();
  console.log('Employees in cloud:', employees);

  const transactions = await prisma.transaction.count();
  console.log('Transactions in cloud:', transactions);
}

main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
