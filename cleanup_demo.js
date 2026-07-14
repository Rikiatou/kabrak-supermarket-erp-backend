const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    },
  },
});

async function main() {
  // Delete demo/inactive employees
  const toDelete = [
    'cmr1mltf40005ne3azfdc1ki3', // ACCOUNTANT EASY SHOP
    'cmr1mltex0003ne3afcvqysur', // David Bouba
    'cmr1mlteu0002ne3aveddzxb3', // Esther Diallo
    'cmr1mlter0001ne3a9ifchwm8', // Paul Mbarga
    'cmr1mltf00004ne3ascndcj2k', // Rebecca Kameni
  ];

  console.log('=== DELETING DEMO EMPLOYEES ===');
  for (const id of toDelete) {
    await prisma.employee.delete({ where: { id } }).catch(e => console.log(`Skip ${id}: ${e.message}`));
    console.log(`Deleted: ${id}`);
  }

  // Verify
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
