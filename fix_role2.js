const { PrismaClient } = require('@prisma/client');

const cloudPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    },
  },
});

async function main() {
  // Update cloud to manager
  const updated = await cloudPrisma.employee.updateMany({
    where: { firstName: { contains: 'SREEJITH', mode: 'insensitive' } },
    data: { role: 'manager' },
  });
  console.log(`Updated ${updated.count} employee(s) to manager`);

  // Verify
  const emp = await cloudPrisma.employee.findFirst({
    where: { firstName: { contains: 'SREEJITH', mode: 'insensitive' } },
    select: { firstName: true, lastName: true, role: true, tenantId: true },
  });
  console.log(`${emp.firstName} ${emp.lastName} | role: ${emp.role} | tenant: ${emp.tenantId}`);

  await cloudPrisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
