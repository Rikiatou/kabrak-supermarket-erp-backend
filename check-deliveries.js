// Verifie que chaque article des bordereaux d'achat est bien entre en stock.
// Lecture seule : ne modifie rien.
//
//   node check-deliveries.js                    -> bordereaux recus des 7 derniers jours
//   node check-deliveries.js --days=30
//   node check-deliveries.js --order=BC-2026-0042
//
// Pour chaque article : quantite recue, mouvement de stock de la reception, stock avant
// la reception (reconstitue avec les mouvements), ventes depuis, stock actuel, et les
// doublons (autre produit actif avec le meme code-barres / SKU / nom).
// Resultat complet dans verif-livraisons.csv (Excel).
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const p = new PrismaClient();
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const ORDER = arg('order');
const DAYS = parseInt(arg('days') || '7', 10);
const OUT = path.join(process.cwd(), 'verif-livraisons.csv');
const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

async function main() {
  const where = ORDER
    ? { orderNumber: ORDER }
    : { status: 'received', OR: [{ receivedDate: { gte: new Date(Date.now() - DAYS * 864e5) } }, { updatedAt: { gte: new Date(Date.now() - DAYS * 864e5) } }] };
  const orders = await p.purchaseOrder.findMany({
    where,
    include: { supplier: true, items: { include: { product: true }, orderBy: { id: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });
  if (!orders.length) { console.log(ORDER ? `Bordereau ${ORDER} introuvable` : `Aucun bordereau recu ces ${DAYS} derniers jours`); return; }

  const rows = [['bordereau', 'fournisseur', 'code-barres', 'produit', 'actif', 'recu', 'mouvement reception', 'stock avant', 'ventes/sorties depuis', 'autres entrees depuis', 'stock actuel', 'doublons', 'probleme']];
  let problems = 0, total = 0;

  for (const o of orders) {
    console.log(`\n=== ${o.orderNumber}  ${o.supplier?.name || ''}  ${o.items.length} articles ===`);
    for (const it of o.items) {
      total++;
      const pr = it.product;
      const moves = await p.stockMovement.findMany({ where: { productId: it.productId }, orderBy: { createdAt: 'asc' } });
      // Mouvement de cette reception : meme produit, notes/reference avec le numero du bordereau
      const rec = moves.find((m) => m.reason === 'purchase' && m.quantity === it.quantity &&
        (String(m.notes || '').includes(o.orderNumber) || m.reference === o.orderNumber));
      const after = rec ? moves.filter((m) => m.createdAt > rec.createdAt || (m.createdAt.getTime() === rec.createdAt.getTime() && m.id !== rec.id)) : [];
      const outSince = after.filter((m) => m.quantity < 0).reduce((s, m) => s + m.quantity, 0);
      const inSince = after.filter((m) => m.quantity > 0).reduce((s, m) => s + m.quantity, 0);
      const before = rec ? pr.stock - outSince - inSince - it.quantity : null;

      const or = [];
      if (pr.barcode) or.push({ barcode: pr.barcode }, { sku: pr.barcode });
      if (pr.sku) or.push({ sku: pr.sku }, { barcode: pr.sku });
      or.push({ name: { equals: pr.name, mode: 'insensitive' } });
      const dups = await p.product.findMany({ where: { id: { not: pr.id }, isActive: true, OR: or }, select: { name: true, barcode: true, sku: true, stock: true } });

      const issues = [];
      if (!rec) issues.push('aucun mouvement de reception trouve');
      if (!pr.isActive) issues.push('produit desactive (cache dans le stock)');
      if (dups.length) issues.push(`doublon: ${dups.map((d) => `${d.name} [${d.barcode || d.sku}] stock=${d.stock}`).join(' / ')}`);
      if (before !== null && before < 0) issues.push(`stock etait negatif avant (${before}) : vendu avant d'etre receptionne`);
      if (issues.length) problems++;

      rows.push([o.orderNumber, o.supplier?.name, pr.barcode || pr.sku, pr.name, pr.isActive ? 'oui' : 'NON', it.quantity,
        rec ? `+${rec.quantity} le ${rec.createdAt.toLocaleString('fr-FR')}` : 'AUCUN', before ?? '?', outSince, inSince, pr.stock,
        dups.map((d) => `${d.name} [${d.barcode || d.sku}] stock=${d.stock}`).join(' / '), issues.join(' ; ')]);
      if (issues.length) console.log(`!! ${String(pr.barcode || pr.sku).padEnd(14)} ${pr.name}  recu=${it.quantity}  stock=${pr.stock}  -> ${issues.join(' ; ')}`);
    }
  }
  fs.writeFileSync(OUT, '\ufeff' + rows.map((r) => r.map(csv).join(';')).join('\r\n'));
  console.log(`\n${total} articles verifies, ${problems} a regarder. Detail complet : ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());
