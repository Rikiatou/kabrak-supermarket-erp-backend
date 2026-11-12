// Récupère les anciennes versions (lignes "mortes" pas encore nettoyées par VACUUM)
// des produits écrasés en "Pending sync", directement depuis les pages PostgreSQL.
//   node recover-old-names.js            -> affiche ce qui est retrouvé
//   node recover-old-names.js apply      -> restaure nom/prix/catégorie retrouvés
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const APPLY = process.argv.includes('apply');
const ONLY = process.argv.find((a) => a.startsWith('--id='))?.slice(5);

async function main() {
  // Empêche autovacuum d'effacer les anciennes versions pendant la récupération
  await p.$executeRawUnsafe('ALTER TABLE products SET (autovacuum_enabled = false)');
  await p.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pageinspect');
  const cols = await p.$queryRawUnsafe(
    `SELECT attnum, attname FROM pg_attribute WHERE attrelid='products'::regclass AND attnum>0 AND NOT attisdropped`);
  const n = Object.fromEntries(cols.map((c) => [c.attname, Number(c.attnum)]));
  const txt = (i) => `CASE WHEN a[${i}] IS NULL THEN NULL WHEN get_byte(a[${i}],0)&1=1 THEN convert_from(substring(a[${i}] from 2),'UTF8') ELSE convert_from(substring(a[${i}] from 5),'UTF8') END`;
  const int = (i) => `CASE WHEN a[${i}] IS NULL THEN NULL ELSE get_byte(a[${i}],0)+get_byte(a[${i}],1)*256+get_byte(a[${i}],2)*65536+get_byte(a[${i}],3)*16777216 END`;

  const damaged = ONLY ? [{ id: ONLY }] : await p.product.findMany({ where: { name: 'Pending sync' }, select: { id: true } });
  const ids = new Set(damaged.map((d) => d.id));
  console.log(`Produits a retrouver: ${ids.size}`);
  if (!ids.size) return;

  const rows = await p.$queryRawUnsafe(`
    WITH pages AS (SELECT generate_series(0, (pg_relation_size('products')/current_setting('block_size')::int)-1)::int AS blk),
    t AS (
      SELECT h.t_xmin::text::bigint AS xmin,
             tuple_data_split('products'::regclass, h.t_data, h.t_infomask, h.t_infomask2, h.t_bits) AS a
      FROM pages, heap_page_items(get_raw_page('products', blk)) h
      WHERE h.lp_flags = 1 AND h.t_data IS NOT NULL)
    SELECT xmin, ${txt(n.id)} AS id, ${txt(n.name)} AS name, ${txt(n.category)} AS category,
           ${int(n.price)} AS price, ${int(n.costPrice)} AS "costPrice"
    FROM t`);

  const best = new Map();
  for (const r of rows) {
    if (!ids.has(r.id) || !r.name || r.name === 'Pending sync') continue;
    const prev = best.get(r.id);
    if (!prev || Number(r.xmin) > Number(prev.xmin)) best.set(r.id, r);
  }

  for (const id of ids) {
    const r = best.get(id);
    console.log(r ? `RETROUVE ${id} -> "${r.name}" | prix ${r.price} | cout ${r.costPrice} | cat ${r.category}` : `introuvable ${id}`);
    if (APPLY && r && Number(r.price) > 0) {
      await p.product.update({
        where: { id },
        data: { name: r.name, price: Number(r.price), costPrice: Number(r.costPrice) || undefined,
          category: r.category && r.category !== 'Pending sync' ? r.category : undefined, syncStatus: 'pending' },
      });
    }
  }
  if (APPLY) await p.$executeRawUnsafe('ALTER TABLE products RESET (autovacuum_enabled)');
  console.log(`\nRetrouves: ${best.size}/${ids.size}${APPLY ? ' - RESTAURES' : ' (relance avec apply pour restaurer)'}`);
}

main().catch((e) => console.error('ERREUR:', e.message)).finally(() => p.$disconnect());
