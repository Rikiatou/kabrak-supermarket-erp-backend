const { PrismaClient } = require('@prisma/client');
const cloudUrl = 'postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const prisma = new PrismaClient({ datasources: { db: { url: cloudUrl } } });

async function main() {
  const employees = await prisma.employee.findMany({
    select: { id: true, firstName: true, lastName: true, employeeNumber: true },
  });

  // ALL shifts
  const shifts = await prisma.shift.findMany({ orderBy: { openedAt: 'asc' } });
  console.log(`=== ALL SHIFTS (${shifts.length}) ===`);
  shifts.forEach(s => {
    const emp = employees.find(e => e.id === s.employeeId);
    console.log(`  ${s.id} | ${emp ? emp.firstName + ' ' + emp.lastName : s.employeeId} | register=${s.registerId} | opened=${s.openedAt} | closed=${s.closedAt} | status=${s.status} | opening=${s.openingCash} | closing=${s.closingCash}`);
  });

  // ALL transactions
  const txs = await prisma.transaction.findMany({
    orderBy: { date: 'asc' },
    select: { id: true, transactionNumber: true, date: true, total: true, paymentMethod: true, cashierId: true, registerId: true, status: true, subtotal: true, discount: true, tax: true, cashGiven: true, change: true },
  });
  console.log(`\n=== ALL TRANSACTIONS (${txs.length}) ===`);
  txs.forEach(t => {
    const emp = employees.find(e => e.id === t.cashierId);
    console.log(`  ${t.transactionNumber} | ${t.date.toISOString()} | ${emp ? emp.firstName + ' ' + emp.lastName : t.cashierId} | total=${t.total} | ${t.paymentMethod} | reg=${t.registerId} | ${t.status}`);
  });

  // Group transactions by date (YYYY-MM-DD) and by cashier
  console.log('\n=== TRANSACTIONS BY DATE + CASHIER ===');
  const byDate = {};
  txs.forEach(t => {
    if (t.status !== 'completed') return;
    const d = t.date.toISOString().slice(0, 10);
    const emp = employees.find(e => e.id === t.cashierId);
    const name = emp ? emp.firstName + ' ' + emp.lastName : t.cashierId;
    const key = `${d} | ${name}`;
    if (!byDate[key]) byDate[key] = { count: 0, total: 0 };
    byDate[key].count++;
    byDate[key].total += t.total;
  });
  Object.entries(byDate).sort().forEach(([k, v]) => console.log(`  ${k} | ${v.count} tx | total=${v.total}`));
}

main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
