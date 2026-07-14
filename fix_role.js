const { PrismaClient } = require('@prisma/client');

// First check local DB
const localPrisma = new PrismaClient();

// Then update cloud DB
const cloudPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    },
  },
});

async function main() {
  // Check local
  const local = await localPrisma.employee.findFirst({
    where: { firstName: { contains: 'SREEJITH', mode: 'insensitive' } },
  });
  console.log('=== LOCAL (mini PC) ===');
  console.log(`${local.firstName} ${local.lastName} | role: ${local.role} | syncStatus: ${local.syncStatus}`);

  // Update cloud to manager
  const updated = await cloudPrisma.employee.updateMany({
    where: { firstName: { contains: 'SREEJITH', mode: 'insensitive' } },
    data: { role: 'manager' },
  });
  console.log(`\n=== CLOUD UPDATE ===`);
  console.log(`Updated ${updated.count} employee(s) to manager`);

  // Verify cloud
  const cloud = await cloudPrisma.employee.findFirst({
    where: { firstName: { contains: 'SREEJITH', mode: 'insensitive' } },
  });
  console.log(`${cloud.firstName} ${cloud.lastName} | role: ${cloud.role} | tenant: ${cloud.tenantId}`);

  await localPrisma.$disconnect();
  await cloudPrisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
