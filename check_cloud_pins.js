const { PrismaClient } = require('@prisma/client');

const cloudPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    },
  },
});

async function main() {
  const emps = await cloudPrisma.employee.findMany({
    select: { id: true, employeeNumber: true, firstName: true, lastName: true, pin: true, status: true, role: true },
  });
  console.log('=== CLOUD EMPLOYEES ===');
  emps.forEach(e => console.log(e.employeeNumber, '|', e.firstName, e.lastName, '| pin:', e.pin ? `"${e.pin}"` : 'NULL', '| status:', e.status, '| role:', e.role));
  await cloudPrisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
