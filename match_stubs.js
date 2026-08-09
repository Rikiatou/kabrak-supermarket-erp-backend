// Match stub suppliers to real local suppliers by comparing PO items
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // 1. Get stub supplier IDs
  const stubs = await p.supplier.findMany({
    where: { name: '(en attente de sync)' },
    select: { id: true }
  });
  const stubIds = stubs.map(s => s.id);
  console.log(`Stub suppliers: ${stubs.length}`);

  // 2. Get all POs with stub suppliers, including items
  const stubPOs = await p.purchaseOrder.findMany({
    where: { supplierId: { in: stubIds } },
    include: { items: true, supplier: true }
  });
  console.log(`POs with stub suppliers: ${stubPOs.length}`);

  // 3. Get all real suppliers
  const realSuppliers = await p.supplier.findMany({
    where: { NOT: { name: '(en attente de sync)' } },
    select: { id: true, name: true }
  });
  console.log(`Real suppliers: ${realSuppliers.length}`);

  // 4. Get POs with real suppliers, including items
  const realPOs = await p.purchaseOrder.findMany({
    where: { supplier: { NOT: { name: '(en attente de sync)' } } },
    include: { items: true }
  });

  // 5. For each stub, try to find a matching real supplier
  // Strategy: for each stub PO, find a real PO with the same orderNumber
  // (shouldn't exist since we checked 0 dupes)
  // Alternative: match by total + date + item count

  // Better strategy: check if the cloud has the supplier name for these IDs
  // Since cloud doesn't have them, let's try to match by PO items

  // Group stub POs by supplierId
  const stubBySupplier = {};
  stubPOs.forEach(po => {
    if (!stubBySupplier[po.supplierId]) stubBySupplier[po.supplierId] = [];
    stubBySupplier[po.supplierId].push(po);
  });

  // For each stub supplier, look at its POs and try to find a real supplier
  // whose POs have similar items (same product IDs)
  const matches = {};
  let unmatched = 0;

  for (const [stubId, pos] of Object.entries(stubBySupplier)) {
    // Get all product IDs from this stub's POs
    const stubProductIds = new Set();
    pos.forEach(po => po.items.forEach(item => stubProductIds.add(item.productId)));

    // Find real supplier whose POs share the most product IDs
    let bestMatch = null;
    let bestScore = 0;

    for (const real of realSuppliers) {
      const realSupplierPOs = realPOs.filter(po => po.supplierId === real.id);
      if (realSupplierPOs.length === 0) continue;

      const realProductIds = new Set();
      realSupplierPOs.forEach(po => po.items.forEach(item => realProductIds.add(item.productId)));

      // Count shared product IDs
      let shared = 0;
      stubProductIds.forEach(pid => { if (realProductIds.has(pid)) shared++; });

      if (shared > bestScore) {
        bestScore = shared;
        bestMatch = real;
      }
    }

    if (bestMatch && bestScore > 0) {
      matches[stubId] = { realId: bestMatch.id, realName: bestMatch.name, score: bestScore, poCount: pos.length };
      console.log(`MATCH: ${stubId} -> ${bestMatch.name} (score: ${bestScore}, POs: ${pos.length})`);
    } else {
      unmatched++;
      console.log(`NO MATCH: ${stubId} (${pos.length} POs, ${stubProductIds.size} products)`);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Matched: ${Object.keys(matches).length}`);
  console.log(`Unmatched: ${unmatched}`);

  // 6. Apply matches: re-link POs to real suppliers, delete stubs
  if (process.argv.includes('--apply') && Object.keys(matches).length > 0) {
    console.log(`\n=== APPLYING ===`);
    for (const [stubId, match] of Object.entries(matches)) {
      // Update all POs from stub to real supplier
      const r = await p.purchaseOrder.updateMany({
        where: { supplierId: stubId },
        data: { supplierId: match.realId }
      });
      console.log(`Re-linked ${r.count} POs from ${stubId} to ${match.realName}`);

      // Delete the stub
      await p.supplier.delete({ where: { id: stubId } });
      console.log(`Deleted stub ${stubId}`);
    }
    console.log(`=== DONE ===`);
  } else {
    console.log(`\nRun with --apply to re-link POs and delete stubs`);
  }
}

main().catch(e => console.error(e)).finally(() => p.$disconnect());
