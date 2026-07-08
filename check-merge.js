const { PrismaClient } = require('@prisma/client');
const cloudUrl = 'postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const prisma = new PrismaClient({ datasources: { db: { url: cloudUrl } } });

async function main() {
  // The duplicates to merge:
  // BLESSING BLESSING (cmr1t087v001i8lql54f4f0vf) → BLESSING EKOLI (cmr0gtp7r004gnot7vewzxnhp)
  // Check if there's a PELAGIE duplicate too
  
  const duplicates = [
    { dupId: 'cmr1t087v001i8lql54f4f0vf', dupName: 'BLESSING BLESSING', keepId: 'cmr0gtp7r004gnot7vewzxnhp', keepName: 'BLESSING EKOLI' },
  ];

  for (const { dupId, dupName, keepId, keepName } of duplicates) {
    console.log(`\n=== ${dupName} (${dupId}) → ${keepName} (${keepId}) ===`);
    
    // Transactions
    const txs = await prisma.transaction.findMany({ where: { cashierId: dupId } });
    console.log(`  Transactions: ${txs.length}`);
    txs.forEach(t => console.log(`    ${t.transactionNumber} | ${t.date} | ${t.total} | ${t.status}`));
    
    // Shifts
    const shifts = await prisma.shift.findMany({ where: { employeeId: dupId } });
    console.log(`  Shifts: ${shifts.length}`);
    shifts.forEach(s => console.log(`    ${s.id} | opened=${s.openedAt} | closed=${s.closedAt} | status=${s.status}`));
    
    // Any other references?
    const returns = await prisma.return.findMany({ where: { employeeId: dupId } }).catch(() => []);
    console.log(`  Returns: ${returns.length}`);
  }

  // Also check: are there any other employees that look like duplicates?
  const allEmps = await prisma.employee.findMany();
  console.log('\n=== ALL CLOUD EMPLOYEES ===');
  allEmps.forEach(e => console.log(`  ${e.employeeNumber} | ${e.firstName} ${e.lastName} | ${e.role} | ${e.id} | lic=${e.licenseKey}`));

  // Check if "Patron Easy Shop" (boss) has a duplicate
  // Check if "RITA ABEN" (stockist) has a duplicate
  const bosses = allEmps.filter(e => e.role === 'boss');
  const stockists = allEmps.filter(e => e.role === 'stockist');
  const cashiers = allEmps.filter(e => e.role === 'cashier');
  const managers = allEmps.filter(e => e.role === 'manager');
  
  console.log(`\nBosses: ${bosses.length}, Stockists: ${stockists.length}, Cashiers: ${cashiers.length}, Managers: ${managers.length}`);
  
  // Check transactions for BLESSING BLESSING's shift
  const blessingBlessingShifts = await prisma.shift.findMany({ 
    where: { employeeId: 'cmr1t087v001i8lql54f4f0vf' } 
  });
  for (const s of blessingBlessingShifts) {
    const txs = await prisma.transaction.findMany({
      where: { registerId: s.registerId, date: { gte: s.openedAt, lte: s.closedAt || new Date() } }
    });
    console.log(`\n  Shift ${s.id} (reg=${s.registerId}): ${txs.length} transactions in this period`);
    txs.forEach(t => {
      const emp = allEmps.find(e => e.id === t.cashierId);
      console.log(`    ${t.transactionNumber} | ${emp?.firstName} ${emp?.lastName} | ${t.total}`);
    });
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
