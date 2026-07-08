const { PrismaClient } = require('@prisma/client');
const cloudUrl = 'postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const prisma = new PrismaClient({ datasources: { db: { url: cloudUrl } } });

async function main() {
  const employees = await prisma.employee.findMany({
    select: { id: true, firstName: true, lastName: true, employeeNumber: true },
  });

  // Check transactions for 30/06/2026 and 01/07/2026
  for (const dateStr of ['2026-06-30', '2026-07-01']) {
    const dayStart = new Date(`${dateStr}T00:00:00.000`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999`);
    const txs = await prisma.transaction.findMany({
      where: { date: { gte: dayStart, lte: dayEnd }, status: 'completed' },
      select: { total: true, paymentMethod: true, cashierId: true },
    });
    console.log(`\n=== ${dateStr}: ${txs.length} transactions ===`);
    
    // Group by cashier
    const byCashier = {};
    txs.forEach(t => {
      const emp = employees.find(e => e.id === t.cashierId);
      const name = emp ? emp.firstName + ' ' + emp.lastName : t.cashierId;
      if (!byCashier[name]) byCashier[name] = { count: 0, total: 0, cash: 0, card: 0, mobile: 0 };
      byCashier[name].count++;
      byCashier[name].total += t.total;
      byCashier[name][t.paymentMethod] = (byCashier[name][t.paymentMethod] || 0) + t.total;
    });
    Object.entries(byCashier).forEach(([name, data]) => {
      console.log(`  ${name}: ${data.count} tx, total=${data.total}, cash=${data.cash}, card=${data.card}, mobile=${data.mobile}`);
    });
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
