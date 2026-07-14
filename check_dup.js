const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    },
  },
});

async function main() {
  // Find duplicates by firstName + lastName
  const dups = await prisma.$queryRawUnsafe(`
    SELECT "firstName", "lastName", COUNT(*) as cnt
    FROM employees
    GROUP BY "firstName", "lastName"
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC
  `);
  console.log('=== DUPLICATES BY NAME ===');
  dups.forEach(d => console.log(`${d.firstName} ${d.lastName} → ${d.cnt} copies`));

  // Show all employees with details
  const all = await prisma.employee.findMany({
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      tenantId: true,
      licenseKey: true,
      syncStatus: true,
      createdAt: true,
    },
    orderBy: { firstName: 'asc' },
  });
  console.log('\n=== ALL EMPLOYEES (' + all.length + ') ===');
  all.forEach(e => {
    console.log(`${e.firstName} ${e.lastName} | EMP: ${e.employeeNumber} | role: ${e.role} | tenant: ${e.tenantId || 'NULL'} | license: ${e.licenseKey || 'NULL'} | status: ${e.status} | id: ${e.id} | created: ${e.createdAt}`);
  });

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
