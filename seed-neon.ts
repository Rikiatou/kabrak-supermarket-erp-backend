import { PrismaClient } from '@prisma/client';

// Force Neon URL
const DATABASE_URL = "postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

async function main() {
  console.log('🌱 Début du seed (Neon)...');
  console.log('URL:', DATABASE_URL.replace(/:[^:@]+@/, ':***@'));

  // Test connexion
  await prisma.$connect();
  console.log('✅ Connecté à Neon!');

  // Nettoyer la DB
  await prisma.syncLog.deleteMany();
  await prisma.loyaltyHistory.deleteMany();
  await prisma.invoicePayment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.transactionItem.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.cashRegister.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  console.log('✅ DB nettoyée');

  // Maintenant on lance le seed normal
  const { execSync } = require('child_process');
  execSync('npx ts-node prisma/seed.ts', { stdio: 'inherit', env: { ...process.env, DATABASE_URL } });
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
