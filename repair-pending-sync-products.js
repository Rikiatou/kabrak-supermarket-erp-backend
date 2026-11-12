// Répare les produits locaux écrasés par des "stubs" cloud (nom "Pending sync", prix 0).
// Sources : doublon local même code-barres, ventes passées (prix), achats (coût),
// retours / factures (nom). Usage :
//   node repair-pending-sync-products.js          -> simulation (rien n'est modifié)
//   node repair-pending-sync-products.js --apply  -> applique
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const STUB = 'Pending sync';

const mode = (values) => {
  const counts = new Map();
  for (const v of values) if (v > 0) counts.set(v, (counts.get(v) || 0) + 1);
  let best = 0, n = 0;
  for (const [v, c] of counts) if (c > n) { best = v; n = c; }
  return best;
};

async function main() {
  const bad = await p.product.findMany({
    where: { OR: [{ name: STUB }, { category: STUB }, { price: 0, sku: { startsWith: 'STUB-' } }] },
  });
  console.log(`Produits abimes: ${bad.length}${APPLY ? '' : '  (SIMULATION - ajoute --apply pour appliquer)'}`);

  const toRename = [];
  for (const prod of bad) {
    const twin = prod.barcode ? await p.product.findFirst({
      where: { barcode: prod.barcode, id: { not: prod.id }, NOT: { name: STUB }, price: { gt: 0 } },
      orderBy: { updatedAt: 'desc' },
    }) : null;

    const sales = await p.transactionItem.findMany({
      where: { productId: prod.id, unitPrice: { gt: 0 } },
      orderBy: { transaction: { date: 'desc' } }, take: 30, select: { unitPrice: true },
    });
    const purchase = await p.purchaseOrderItem.findFirst({
      where: { productId: prod.id, unitCost: { gt: 0 } }, orderBy: { id: 'desc' }, select: { unitCost: true },
    });
    const ret = await p.returnItem.findFirst({
      where: { productId: prod.id, NOT: { productName: STUB } }, select: { productName: true },
    });
    const inv = await p.invoiceItem.findFirst({
      where: { productId: prod.id, NOT: { description: STUB } }, select: { description: true },
    });

    const name = twin?.name || ret?.productName || inv?.description || null;
    const price = twin?.price || mode(sales.map((s) => s.unitPrice)) || 0;
    const costPrice = (prod.costPrice > 0 ? prod.costPrice : 0) || twin?.costPrice || purchase?.unitCost || 0;
    const category = prod.category === STUB || !prod.category ? (twin?.category || 'A VERIFIER') : prod.category;

    const data = {
      name: name || `A RENOMMER ${prod.barcode || prod.sku}`,
      category, syncStatus: 'pending',
      ...(price > 0 ? { price } : {}),
      ...(costPrice > 0 ? { costPrice } : {}),
      ...(twin && !prod.unit ? { unit: twin.unit } : {}),
    };
    console.log(`${prod.barcode.padEnd(14)} stock=${String(prod.stock).padStart(4)} -> "${data.name}" prix=${price || '??'} cout=${costPrice || '??'}` +
      ` [src: ${twin ? 'doublon' : ''}${sales.length ? ` ${sales.length} ventes` : ''}${ret ? ' retour' : ''}${inv ? ' facture' : ''}]`);
    if (!name || !price) toRename.push({ barcode: prod.barcode, stock: prod.stock, manque: [!name && 'nom', !price && 'prix'].filter(Boolean).join('+') });
    if (APPLY) await p.product.update({ where: { id: prod.id }, data });
  }

  if (toRename.length) {
    console.log(`\n${toRename.length} produit(s) a completer a la main (page Produits, chercher le code-barres) :`);
    console.table(toRename);
  }
  console.log(APPLY ? '\nTERMINE - produits repares et remis en file de synchro.' : '\nSimulation terminee. Relance avec --apply.');
}

main().catch((e) => console.error('ERREUR:', e.message)).finally(() => p.$disconnect());
