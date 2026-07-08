const { PrismaClient } = require('@prisma/client');
const cloudUrl = 'postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const prisma = new PrismaClient({ datasources: { db: { url: cloudUrl } } });

async function main() {
  const DUP_ID = 'cmr1t087v001i8lql54f4f0vf';      // BLESSING BLESSING (duplicate)
  const KEEP_ID = 'cmr0gtp7r004gnot7vewzxnhp';      // BLESSING EKOLI (real)

  console.log('=== MERGING BLESSING BLESSING → BLESSING EKOLI ===\n');

  // 1. Reassign shift from duplicate to real employee
  const shifts = await prisma.shift.findMany({ where: { employeeId: DUP_ID } });
  console.log(`Found ${shifts.length} shift(s) to reassign`);
  for (const s of shifts) {
    await prisma.shift.update({ where: { id: s.id }, data: { employeeId: KEEP_ID } });
    console.log(`  Shift ${s.id} reassigned`);
  }

  // 2. Reassign any transactions (should be 0 but just in case)
  const txs = await prisma.transaction.findMany({ where: { cashierId: DUP_ID } });
  console.log(`Found ${txs.length} transaction(s) to reassign`);
  for (const t of txs) {
    await prisma.transaction.update({ where: { id: t.id }, data: { cashierId: KEEP_ID } });
    console.log(`  Transaction ${t.transactionNumber} reassigned`);
  }

  // 3. Delete the duplicate employee
  await prisma.employee.delete({ where: { id: DUP_ID } });
  console.log(`\nDeleted duplicate employee BLESSING BLESSING (${DUP_ID})`);

  // 4. Verify
  const remaining = await prisma.employee.findMany({
    select: { id: true, firstName: true, lastName: true, role: true, employeeNumber: true },
    orderBy: { role: 'asc' },
  });
  console.log('\n=== REMAINING EMPLOYEES ===');
  remaining.forEach(e => console.log(`  ${e.employeeNumber} | ${e.firstName} ${e.lastName} | ${e.role} | ${e.id}`));

  // 5. Verify BLESSING EKOLI now has all shifts
  const blessingShifts = await prisma.shift.findMany({ where: { employeeId: KEEP_ID } });
  console.log(`\nBLESSING EKOLI now has ${blessingShifts.length} shift(s)`);
  blessingShifts.forEach(s => console.log(`  ${s.id} | opened=${s.openedAt} | closed=${s.closedAt} | status=${s.status}`));
}

main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
