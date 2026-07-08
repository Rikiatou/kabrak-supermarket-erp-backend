const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check employees
  const employees = await prisma.employee.findMany({
    select: { id: true, employeeNumber: true, firstName: true, lastName: true, role: true, status: true },
  });
  console.log(`=== EMPLOYEES (${employees.length}) ===`);
  employees.forEach(e => console.log(`  ${e.employeeNumber} | ${e.firstName} ${e.lastName} | role=${e.role} | status=${e.status}`));

  // Check transactions by date
  const txByDate = await prisma.$queryRaw`
    SELECT DATE("createdAt") as date, COUNT(*) as count, SUM(total) as total
    FROM "Transaction"
    WHERE "createdAt" >= '2025-06-28'
    GROUP BY DATE("createdAt")
    ORDER BY date DESC
  `;
  console.log(`\n=== TRANSACTIONS BY DATE ===`);
  txByDate.forEach(d => console.log(`  ${d.date} | count=${d.count} | total=${d.total}`));

  // Check transactions on June 30
  const txJune30 = await prisma.transaction.findMany({
    where: {
      createdAt: {
        gte: new Date('2025-06-30T00:00:00'),
        lt: new Date('2025-07-01T00:00:00'),
      },
    },
    select: { id: true, createdAt: true, total: true, cashierId: true },
    take: 10,
  });
  console.log(`\n=== TRANSACTIONS ON JUNE 30 (${txJune30.length}) ===`);
  txJune30.forEach(t => console.log(`  ${t.id} | ${t.createdAt} | total=${t.total} | cashier=${t.cashierId}`));
}

main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
