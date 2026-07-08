const { PrismaClient } = require('@prisma/client');

// Check LOCAL database
const localPrisma = new PrismaClient();

// Check CLOUD database
const cloudUrl = 'postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const cloudPrisma = new PrismaClient({ datasources: { db: { url: cloudUrl } } });

async function main() {
  console.log('========== LOCAL DATABASE ==========');
  const localEmps = await localPrisma.employee.findMany({
    select: { id: true, firstName: true, lastName: true, role: true, employeeNumber: true, status: true, licenseKey: true },
  });
  console.log(`\nEmployees (${localEmps.length}):`);
  localEmps.forEach(e => console.log(`  ${e.employeeNumber} | ${e.firstName} ${e.lastName} | ${e.role} | ${e.status} | ${e.id} | lic=${e.licenseKey}`));

  const localTxCount = await localPrisma.transaction.count();
  console.log(`\nTransactions: ${localTxCount}`);

  const localShiftCount = await localPrisma.shift.count();
  console.log(`Shifts: ${localShiftCount}`);

  // Check for 01/07 transactions locally
  const dayStart = new Date('2026-07-01T00:00:00');
  const dayEnd = new Date('2026-07-01T23:59:59');
  const localTxOnDate = await localPrisma.transaction.findMany({
    where: { date: { gte: dayStart, lte: dayEnd } },
    select: { transactionNumber: true, date: true, total: true, cashierId: true, status: true },
  });
  console.log(`\nTransactions on 01/07 locally: ${localTxOnDate.length}`);
  localTxOnDate.forEach(t => {
    const emp = localEmps.find(e => e.id === t.cashierId);
    console.log(`  ${t.transactionNumber} | ${t.date} | ${emp ? emp.firstName + ' ' + emp.lastName : t.cashierId} | ${t.total} | ${t.status}`);
  });

  console.log('\n\n========== CLOUD DATABASE ==========');
  const cloudEmps = await cloudPrisma.employee.findMany({
    select: { id: true, firstName: true, lastName: true, role: true, employeeNumber: true, status: true, licenseKey: true },
  });
  console.log(`\nEmployees (${cloudEmps.length}):`);
  cloudEmps.forEach(e => console.log(`  ${e.employeeNumber} | ${e.firstName} ${e.lastName} | ${e.role} | ${e.status} | ${e.id} | lic=${e.licenseKey}`));

  const cloudTxCount = await cloudPrisma.transaction.count();
  console.log(`\nTransactions: ${cloudTxCount}`);

  // Compare: find duplicates by name
  console.log('\n\n========== DUPLICATE ANALYSIS ==========');
  const allEmps = [...localEmps.map(e => ({...e, source: 'LOCAL'})), ...cloudEmps.map(e => ({...e, source: 'CLOUD'}))];
  
  // Group by normalized name
  const byName = {};
  allEmps.forEach(e => {
    const key = `${e.firstName.toLowerCase().trim()}|${e.lastName.toLowerCase().trim()}`;
    if (!byName[key]) byName[key] = [];
    byName[key].push(e);
  });
  
  console.log('\nEmployees grouped by name:');
  Object.entries(byName).forEach(([key, emps]) => {
    if (emps.length > 1) {
      console.log(`\n  DUPLICATE: ${emps[0].firstName} ${emps[0].lastName}`);
      emps.forEach(e => console.log(`    [${e.source}] ${e.employeeNumber} | ${e.role} | ${e.id}`));
    } else {
      console.log(`  ${emps[0].firstName} ${emps[0].lastName} [${emps[0].source}] — unique`);
    }
  });

  // Also check: same role duplicates
  console.log('\n\nEmployees by role (both DBs):');
  const byRole = {};
  allEmps.forEach(e => {
    if (!byRole[e.role]) byRole[e.role] = [];
    byRole[e.role].push(e);
  });
  Object.entries(byRole).forEach(([role, emps]) => {
    console.log(`\n  ${role} (${emps.length}):`);
    emps.forEach(e => console.log(`    [${e.source}] ${e.firstName} ${e.lastName} | ${e.employeeNumber} | ${e.id}`));
  });
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
