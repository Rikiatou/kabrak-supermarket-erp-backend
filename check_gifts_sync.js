const { PrismaClient } = require('@prisma/client');
const local = new PrismaClient();
const CLOUD_URL = 'postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const cloud = new PrismaClient({ datasources: { db: { url: CLOUD_URL } } });

(async () => {
  const giftWhere = { reason: { in: ['gift_staff', 'gift_other'] } };

  // LOCAL
  const localTotal = await local.stockMovement.count({ where: giftWhere });
  const localPending = await local.stockMovement.count({ where: { ...giftWhere, syncStatus: 'pending' } });
  const localSynced = await local.stockMovement.count({ where: { ...giftWhere, syncStatus: 'synced' } });
  console.log('=== LOCAL gifts ===');
  console.log('Total:', localTotal, '| pending:', localPending, '| synced:', localSynced);

  const localRecent = await local.stockMovement.findMany({
    where: giftWhere, orderBy: { createdAt: 'desc' }, take: 5,
    select: { id: true, reason: true, syncStatus: true, createdAt: true },
  });
  console.log('Recent local gifts:');
  localRecent.forEach(g => console.log(' ', g.createdAt.toISOString(), g.reason, g.syncStatus));

  // CLOUD
  const cloudTotal = await cloud.stockMovement.count({ where: giftWhere });
  console.log('=== CLOUD gifts ===');
  console.log('Total:', cloudTotal);
  const cloudRecent = await cloud.stockMovement.findMany({
    where: giftWhere, orderBy: { createdAt: 'desc' }, take: 5,
    select: { id: true, reason: true, createdAt: true },
  });
  console.log('Recent cloud gifts:');
  cloudRecent.forEach(g => console.log(' ', g.createdAt.toISOString(), g.reason));

  // Failed sync logs for stock movements
  const failed = await local.syncLog.findMany({
    where: { status: 'failed', entityType: 'stock_movement' },
    orderBy: { lastAttempt: 'desc' }, take: 5,
    select: { entityId: true, error: true, lastAttempt: true },
  });
  console.log('=== Recent failed stock_movement syncs ===');
  failed.forEach(l => console.log(' ', l.lastAttempt.toISOString(), (l.error || '').slice(0, 150)));
})()
  .catch(e => console.error('ERR:', e.message))
  .finally(() => { local.$disconnect(); cloud.$disconnect(); });
