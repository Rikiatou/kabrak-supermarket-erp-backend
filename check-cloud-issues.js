const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: "postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require" } },
});

async function main() {
  // Check employees on cloud
  const employees = await prisma.employee.findMany({
    select: { id: true, employeeNumber: true, firstName: true, lastName: true, role: true, status: true },
  });
  console.log(`=== CLOUD EMPLOYEES (${employees.length}) ===`);
  employees.forEach(e => console.log(`  ${e.employeeNumber} | ${e.firstName} ${e.lastName} | role=${e.role} | status=${e.status}`));

  // Transactions by date on cloud
  const txByDate = await prisma.$queryRaw`
    SELECT DATE("createdAt") as date, COUNT(*)::int as count, SUM(total) as total
    FROM transactions
    WHERE "createdAt" >= '2025-06-28'
    GROUP BY DATE("createdAt")
    ORDER BY date DESC
  `;
  console.log(`\n=== CLOUD TRANSACTIONS BY DATE ===`);
  txByDate.forEach(d => console.log(`  ${d.date} | count=${d.count} | total=${d.total}`));

  // Total transactions
  const totalTx = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM transactions`;
  console.log(`\nTotal cloud transactions: ${totalTx[0].count}`);

  // Products with expiry
  const withExpiry = await prisma.product.count({ where: { expiryDate: { not: null } } });
  console.log(`\nCloud products with expiryDate: ${withExpiry}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
