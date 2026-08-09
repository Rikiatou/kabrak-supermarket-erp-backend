// Fetch real supplier names from cloud and update local stubs
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const CLOUD_API = 'https://kabrak-api-production.up.railway.app/api';
const CLOUD_KEY = 'kabrak-local-sync-key';

async function main() {
  // 1. Get all stub supplier IDs
  const stubs = await p.supplier.findMany({
    where: { name: '(en attente de sync)' },
    select: { id: true }
  });
  console.log(`Found ${stubs.length} stub suppliers locally`);

  // 2. Fetch all suppliers from cloud
  console.log('Fetching suppliers from cloud...');
  const res = await fetch(`${CLOUD_API}/suppliers?limit=500`, {
    headers: { 'x-api-key': CLOUD_KEY }
  });
  if (!res.ok) {
    console.error('Cloud API error:', res.status, await res.text());
    return;
  }
  const cloudData = await res.json();
  const cloudSuppliers = cloudData.data || cloudData;
  console.log(`Got ${cloudSuppliers.length} suppliers from cloud`);

  // 3. Match stub IDs with cloud suppliers
  let updated = 0;
  let notFound = 0;
  for (const stub of stubs) {
    const cloudSup = cloudSuppliers.find(s => s.id === stub.id);
    if (cloudSup && cloudSup.name && cloudSup.name !== '(en attente de sync)') {
      await p.supplier.update({
        where: { id: stub.id },
        data: {
          name: cloudSup.name,
          contact: cloudSup.contact || '',
          phone: cloudSup.phone || '',
          email: cloudSup.email || null,
          address: cloudSup.address || null,
          paymentTerms: cloudSup.paymentTerms || '30 jours',
          rating: cloudSup.rating || 0,
        }
      });
      console.log(`  Updated ${stub.id} -> "${cloudSup.name}"`);
      updated++;
    } else {
      console.log(`  NOT FOUND in cloud: ${stub.id}`);
      notFound++;
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Not found: ${notFound}`);
}

main().catch(e => console.error(e)).finally(() => p.$disconnect());
