const { PrismaClient } = require('@prisma/client');

const cloudPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    },
  },
});

async function main() {
  const emp = await cloudPrisma.employee.findUnique({
    where: { id: 'cmr15n2r00003mi7toveqhi5s' },
  }).catch(() => null);
  console.log('Cloud employee (by local ID):', emp ? 'FOUND' : 'NOT FOUND');

  // Check by employeeNumber instead
  const allEmps = await cloudPrisma.employee.findMany({
    select: { id: true, employeeNumber: true, firstName: true, lastName: true },
  });
  console.log('\nAll cloud employees:');
  allEmps.forEach(e => console.log(`  ${e.id} | ${e.employeeNumber} | ${e.firstName} ${e.lastName}`));

  await cloudPrisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
