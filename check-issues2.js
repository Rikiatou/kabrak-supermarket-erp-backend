const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // List all tables
  const tables = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `;
  console.log('=== TABLES ===');
  tables.forEach(t => console.log(`  ${t.table_name}`));

  // Check if Sale table exists
  const salesCount = await prisma.sale.count().catch(() => -1);
  console.log(`\nSale count: ${salesCount}`);

  // Check transactions via Shift
  const shifts = await prisma.shift.findMany({
    select: { id: true, cashierId: true, startTime: true, endTime: true, status: true },
    take: 10,
    orderBy: { startTime: 'desc' },
  }).catch(() => []);
  console.log(`\n=== SHIFTS (${shifts.length}) ===`);
  shifts.forEach(s => console.log(`  ${s.id} | cashier=${s.cashierId} | start=${s.startTime} | end=${s.endTime} | status=${s.status}`));
}

main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
