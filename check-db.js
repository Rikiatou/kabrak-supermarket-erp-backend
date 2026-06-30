// Quick script to check row counts in the Neon cloud DB
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    },
  },
});

async function main() {
  const counts = {
    users: await prisma.user.count(),
    products: await prisma.product.count(),
    transactions: await prisma.transaction.count(),
    stockMovements: await prisma.stockMovement.count(),
    invoices: await prisma.invoice.count(),
    customers: await prisma.customer.count(),
    suppliers: await prisma.supplier.count(),
    employees: await prisma.employee.count(),
    cashRegisters: await prisma.cashRegister.count(),
    shifts: await prisma.shift.count(),
    gifts: await prisma.gift.count(),
    losses: await prisma.loss.count(),
  };
  console.log('\n=== NEON CLOUD DB COUNTS ===');
  for (const [k, v] of Object.entries(counts)) {
    console.log(`  ${k}: ${v}`);
  }
  console.log('=== END ===\n');
}

main()
  .catch((e) => { console.error('ERROR:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
