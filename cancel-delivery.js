// Annule un bordereau d'achat recu en double : retire du stock ce qu'il avait ajoute.
//
//   node cancel-delivery.js                              -> bordereaux des 3 derniers jours + doublons probables
//   node cancel-delivery.js --days=7
//   node cancel-delivery.js --order=BC-2026-0042         -> montre ce qui sera retire (ne modifie rien)
//   node cancel-delivery.js --order=BC-2026-0042 --apply -> annule vraiment
//
// L'annulation : stock de chaque article - quantite recue, un mouvement "purchase_cancel"
// par article (visible dans l'historique produit), bordereau passe en "cancelled".
// Les prix ne sont pas touches (le doublon a remis les memes prix).
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const p = new PrismaClient();
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const ORDER = arg('order');
const DAYS = parseInt(arg('days') || '3', 10);
const APPLY = process.argv.includes('--apply');
const fmt = (d) => (d ? new Date(d).toLocaleString('fr-FR') : '?');

async function list() {
  const orders = await p.purchaseOrder.findMany({
    where: { createdAt: { gte: new Date(Date.now() - DAYS * 864e5) } },
    include: { supplier: true, items: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!orders.length) { console.log(`Aucun bordereau ces ${DAYS} derniers jours`); return; }
  console.log(`Bordereaux des ${DAYS} derniers jours :\n`);
  for (const o of orders) {
    console.log(`${o.orderNumber.padEnd(14)} ${fmt(o.createdAt).padEnd(20)} ${String(o.status).padEnd(10)} ${String(o.items.length).padStart(4)} articles  total ${Math.round(o.total)}  ${o.supplier?.name || ''}`);
  }
  const key = (it) => `${it.productId}:${it.quantity}`;
  const received = orders.filter((o) => o.status === 'received');
  let found = 0;
  for (let i = 0; i < received.length; i++) {
    for (let j = i + 1; j < received.length; j++) {
      const a = received[i], b = received[j];
      if (a.supplierId !== b.supplierId) continue;
      const kb = new Set(b.items.map(key));
      const common = a.items.filter((it) => kb.has(key(it))).length;
      const smaller = Math.min(a.items.length, b.items.length);
      if (smaller > 0 && common >= smaller * 0.9) {
        found++;
        console.log(`\nDOUBLON PROBABLE : ${a.orderNumber} (${a.items.length} art.) et ${b.orderNumber} (${b.items.length} art.) -> ${common} articles identiques (meme produit, meme quantite)`);
      }
    }
  }
  if (!found) console.log('\nAucun doublon evident trouve.');
  else console.log('\nPour voir ce que retirerait l\'annulation : node cancel-delivery.js --order=NUMERO_DU_DOUBLON');
}

async function cancel() {
  const o = await p.purchaseOrder.findFirst({
    where: { orderNumber: ORDER },
    include: { supplier: true, items: { include: { product: true } } },
  });
  if (!o) { console.log(`Bordereau ${ORDER} introuvable`); return; }
  if (o.status !== 'received') { console.log(`${ORDER} est "${o.status}" : seul un bordereau recu peut etre annule ici. Rien n'a ete modifie.`); return; }
  console.log(`${o.orderNumber}  ${o.supplier?.name || ''}  ${fmt(o.createdAt)}  ${o.items.length} articles  total ${Math.round(o.total)}\n`);
  for (const it of o.items) {
    const pr = it.product;
    console.log(`${String(pr.barcode || pr.sku || '').padEnd(14)} ${pr.name.slice(0, 40).padEnd(40)} stock ${pr.stock} -> ${pr.stock - it.quantity}  (-${it.quantity})`);
  }
  if (!APPLY) {
    console.log(`\nRIEN N'A ETE MODIFIE. Pour annuler vraiment : node cancel-delivery.js --order=${ORDER} --apply`);
    return;
  }
  await p.$transaction(async (tx) => {
    for (const it of o.items) {
      await tx.product.update({ where: { id: it.productId }, data: { stock: { decrement: it.quantity }, syncStatus: 'pending' } });
    }
    await tx.stockMovement.createMany({
      data: o.items.map((it) => ({
        productId: it.productId,
        type: 'out',
        quantity: -it.quantity,
        reason: 'purchase_cancel',
        reference: o.orderNumber,
        notes: `Annulation bordereau en double ${o.orderNumber}`,
      })),
    });
    await tx.purchaseOrder.update({
      where: { id: o.id },
      data: { status: 'cancelled', syncStatus: 'pending', notes: [o.notes, 'Annule (doublon)'].filter(Boolean).join(' | ') },
    });
  }, { maxWait: 30000, timeout: 120000 });
  console.log(`\nOK : ${o.orderNumber} annule, ${o.items.length} articles retires du stock.`);
}

(ORDER ? cancel() : list())
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
