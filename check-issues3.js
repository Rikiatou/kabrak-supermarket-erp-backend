const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Transactions by date (raw SQL with lowercase table)
  const txByDate = await prisma.$queryRaw`
    SELECT DATE("createdAt") as date, COUNT(*) as count, SUM(total) as total
    FROM transactions
    WHERE "createdAt" >= '2025-06-28'
    GROUP BY DATE("createdAt")
    ORDER BY date DESC
  `;
  console.log('=== TRANSACTIONS BY DATE ===');
  txByDate.forEach(d => console.log(`  ${d.date} | count=${d.count} | total=${d.total}`));

  // Check transactions on June 30
  const txJune30 = await prisma.$queryRaw`
    SELECT id, "createdAt", total, "cashierId"
    FROM transactions
    WHERE "createdAt" >= '2025-06-30' AND "createdAt" < '2025-07-01'
    LIMIT 10
  `;
  console.log(`\n=== TRANSACTIONS ON JUNE 30 (${txJune30.length}) ===`);
  txJune30.forEach(t => console.log(`  ${t.id} | ${t.createdAt} | total=${t.total} | cashier=${t.cashierId}`));

  // Check total transactions
  const totalTx = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM transactions`;
  console.log(`\nTotal transactions: ${totalTx[0].count}`);
}
