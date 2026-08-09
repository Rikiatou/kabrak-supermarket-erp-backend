const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const CLOUD_API = 'https://kabrak-api-production.up.railway.app/api';
const CLOUD_KEY = 'kabrak-local-sync-key';

(async () => {
  // Prendre 1 stock movement pending qui est un gift
  const sm = await p.stockMovement.findFirst({ where: { syncStatus: 'pending', reason: { in: ['gift_staff', 'gift_other'] } } });
  if (!sm) { console.log('Aucun gift pending'); return; }
  console.log('Test sync gift:', sm.id, sm.reason);
  console.log('Full data:', JSON.stringify(sm, null, 2));

  const res = await fetch(`${CLOUD_API}/cloud-sync/stock-movements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': CLOUD_KEY },
    body: JSON.stringify(sm),
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text.slice(0, 800));
})().catch(e => console.error('ERR:', e.message)).finally(() => p.$disconnect());
