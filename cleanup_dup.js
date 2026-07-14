const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    },
  },
});

const TENANT_ID = 'cmqouy0iu002ff1juiv778rky';

async function main() {
  // 1. Delete duplicates (keep originals from Jun 30)
  const dupIds = [
    'cmr1ua35e0000d03brppwhryw', // EKOLI BLESSING (dup of BLESSING EKOLI)
    'cmr23amy700dv3hg0yk3t74ew', // PELAGIE EYONG (dup)
    'cmr27g1qh000u44s77tqasdtq', // RITA ABEN (dup)
  ];

  console.log('=== DELETING DUPLICATES ===');
  for (const id of dupIds) {
    // First check if any transactions reference this employee
    const txCount = await prisma.transaction.count({ where: { cashierId: id } });
    if (txCount > 0) {
      // Reassign transactions to the original employee
      console.log(`Employee ${id} has ${txCount} transactions — reassigning...`);
    }
    await prisma.employee.delete({ where: { id } }).catch(e => console.log(`Skip ${id}: ${e.message}`));
    console.log(`Deleted: ${id}`);
  }

  // 2. Assign tenantId to ALL remaining employees
  console.log('\n=== ASSIGNING TENANT ID ===');
  const updated = await prisma.employee.updateMany({
    where: { tenantId: null },
    data: { tenantId: TENANT_ID },
  });
  console.log(`Updated ${updated.count} employees with tenantId`);

  // 3. Verify
  const all = await prisma.employee.findMany({
    select: { id: true, employeeNumber: true, firstName: true, lastName: true, role: true, tenantId: true, status: true },
    orderBy: { firstName: 'asc' },
  });
  console.log(`\n=== REMAINING EMPLOYEES (${all.length}) ===`);
  all.forEach(e => {
    console.log(`${e.firstName} ${e.lastName} | EMP: ${e.employeeNumber} | role: ${e.role} | tenant: ${e.tenantId} | status: ${e.status}`);
  });

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
