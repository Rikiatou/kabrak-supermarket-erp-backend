const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get the most recent shift
  const shifts = await prisma.shift.findMany({
    orderBy: { openedAt: 'desc' },
    take: 5,
    select: { id: true, employeeId: true, openedAt: true, closedAt: true, status: true, registerId: true }
  });
  console.log('Recent shifts:');
  for (const s of shifts) {
    console.log(`  id=${s.id} emp=${s.employeeId} opened=${s.openedAt} closed=${s.closedAt} status=${s.status} reg=${s.registerId}`);
  }
  
  // Get today's transactions
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const txCount = await prisma.transaction.count({
    where: { date: { gte: today, lt: tomorrow }, status: 'completed' }
  });
  console.log(`\nToday's completed transactions: ${txCount}`);
  
  const txSum = await prisma.transaction.aggregate({
    where: { date: { gte: today, lt: tomorrow }, status: 'completed' },
    _sum: { total: true },
    _count: true
  });
  console.log(`Total revenue today: ${txSum._sum.total || 0}, count: ${txSum._count}`);
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
