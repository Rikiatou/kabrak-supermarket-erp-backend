// Retrouve le nom et le prix des produits abimes ("Pending sync", "A RENOMMER ...", prix 0).
// Sources, dans l'ordre :
//   1. l'ancien logiciel Retail Plus 50 (C:\Retail Plus 50\POS\POSINV.DBF), par code-barres (PLU)
//   2. l'historique des ventes (prix le plus souvent encaisse) et des achats (cout)
//   3. Open Food Facts / Open Beauty Facts (nom seulement, codes EAN)
// Ce qui reste est exporte dans produits-a-completer.csv (Excel). On le remplit en rayon,
// puis on le reimporte.
//
//   node recover-unknown-products.js                      -> simulation, rien n'est modifie
//   node recover-unknown-products.js --apply              -> applique
//   node recover-unknown-products.js --no-internet        -> sans Open Food Facts
//   node recover-unknown-products.js --dbf=D:/RP50/POS/POSINV.DBF
//   node recover-unknown-products.js --import=produits-a-completer.csv [--apply]
require('dotenv').config();
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const p = new PrismaClient();
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const APPLY = process.argv.includes('--apply');
const INTERNET = !process.argv.includes('--no-internet');
const DBF = arg('dbf') || 'C:/Retail Plus 50/POS/POSINV.DBF';
const IMPORT = arg('import');
const OUT = path.join(process.cwd(), 'produits-a-completer.csv');
const STUB = 'Pending sync';

const isDamagedName = (n) => !n || n === STUB || n.startsWith('A RENOMMER');
const mode = (values) => {
  const counts = new Map();
  for (const v of values) if (v > 0) counts.set(v, (counts.get(v) || 0) + 1);
  let best = 0, n = 0;
  for (const [v, c] of counts) if (c > n) { best = v; n = c; }
  return best;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readRetailPlus(file) {
  if (!fs.existsSync(file)) { console.log(`Retail Plus introuvable (${file}) -> source ignoree`); return new Map(); }
  const tmp = path.join(os.tmpdir(), `rp_${Date.now()}.py`);
  fs.writeFileSync(tmp, [
    'import json, sys',
    'from dbfread import DBF',
    `db = DBF(${JSON.stringify(file)}, encoding="latin-1", load=False)`,
    'out = []',
    'for r in db:',
    '    out.append({k: (v if isinstance(v, (str, int, float)) else None) for k, v in r.items() if k in ("PLU","PROD","UNITPRICE1","LASTCOST","AVGCOST","DEPT","BRAND")})',
    'sys.stdout.write(json.dumps(out))',
  ].join('\n'));
  try {
    const rows = JSON.parse(execSync(`python "${tmp}"`, { maxBuffer: 200 * 1024 * 1024 }).toString());
    const map = new Map();
    for (const r of rows) {
      const plu = String(r.PLU || '').trim();
      const name = String(r.PROD || '').trim().replace(/^[`,.'"\s-]+/, '').trim();
      if (!plu || !name) continue;
      map.set(plu, {
        name,
        price: Math.round(parseFloat(r.UNITPRICE1 || 0)) || 0,
        costPrice: Math.round(parseFloat(r.LASTCOST || r.AVGCOST || 0)) || 0,
        category: String(r.DEPT || '').trim() || null,
        brand: String(r.BRAND || '').trim() || null,
      });
    }
    console.log(`Retail Plus : ${map.size} produits lus`);
    return map;
  } catch (e) {
    console.log(`Retail Plus illisible (${e.message.split('\n')[0]}). Installez : pip install dbfread`);
    return new Map();
  } finally {
    try { fs.unlinkSync(tmp); } catch {}
  }
}

function getJson(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'KABRAK-ERP/1.0 (recover)' }, timeout: 10000 }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

async function lookupOnline(barcode) {
  if (!/^\d{8}$|^\d{12,14}$/.test(barcode)) return null;
  for (const host of ['world.openfoodfacts.org', 'world.openbeautyfacts.org', 'world.openproductsfacts.org']) {
    const d = await getJson(`https://${host}/api/v2/product/${barcode}.json?fields=product_name,product_name_fr,brands,quantity`);
    await sleep(700);
    const pr = d?.status === 1 ? d.product : null;
    const name = pr && (pr.product_name_fr || pr.product_name);
    if (name) {
      const brand = (pr.brands || '').split(',')[0].trim();
      return [brand && !name.toLowerCase().includes(brand.toLowerCase()) ? brand : '', name, pr.quantity || '']
        .filter(Boolean).join(' ').toUpperCase().slice(0, 120);
    }
  }
  return null;
}

const csvCell = (v) => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  const sep = text.split('\n')[0].includes(';') ? ';' : ',';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

async function importCsv(file) {
  const rows = parseCsv(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  const head = rows.shift().map((h) => h.trim().toLowerCase());
  const col = (k) => head.findIndex((h) => h.startsWith(k));
  const [iId, iName, iPrice, iCost, iCat] = [col('id'), col('nom'), col('prix vente'), col('prix achat'), col('categorie')];
  let done = 0;
  for (const r of rows) {
    const id = r[iId]?.trim();
    if (!id) continue;
    const name = r[iName]?.trim();
    const price = Math.round(parseFloat(String(r[iPrice] || '').replace(/\s/g, '').replace(',', '.'))) || 0;
    const cost = Math.round(parseFloat(String(r[iCost] || '').replace(/\s/g, '').replace(',', '.'))) || 0;
    const cat = r[iCat]?.trim();
    const data = {
      ...(name && !isDamagedName(name) ? { name: name.toUpperCase() } : {}),
      ...(price > 0 ? { price } : {}),
      ...(cost > 0 ? { costPrice: cost } : {}),
      ...(cat && cat !== STUB && cat !== 'A VERIFIER' ? { category: cat } : {}),
    };
    if (!Object.keys(data).length) continue;
    console.log(`${id} -> ${JSON.stringify(data)}`);
    if (APPLY) await p.product.update({ where: { id }, data: { ...data, syncStatus: 'pending' } });
    done++;
  }
  console.log(`\n${done} produit(s) ${APPLY ? 'mis a jour' : 'a mettre a jour (SIMULATION - ajoutez --apply)'}`);
}

async function main() {
  if (IMPORT) return importCsv(IMPORT);

  const bad = await p.product.findMany({
    where: {
      isActive: true,
      OR: [{ name: STUB }, { name: { startsWith: 'A RENOMMER' } }, { category: STUB }, { price: { lte: 0 } }],
    },
    orderBy: { stock: 'desc' },
  });
  console.log(`Produits a reparer : ${bad.length}${APPLY ? '' : '  (SIMULATION - ajoutez --apply pour enregistrer)'}\n`);
  if (!bad.length) return;

  const rp = readRetailPlus(DBF);
  const left = [];
  let fixed = 0;

  for (const prod of bad) {
    const code = String(prod.barcode || '').trim();
    const old = rp.get(code) || rp.get(String(prod.sku || '').trim());
    const twin = code ? await p.product.findFirst({
      where: { barcode: code, id: { not: prod.id }, NOT: { name: STUB }, price: { gt: 0 } },
    }) : null;
    const sales = await p.transactionItem.findMany({
      where: { productId: prod.id, unitPrice: { gt: 0 } }, take: 50, select: { unitPrice: true },
    });
    const purchase = await p.purchaseOrderItem.findFirst({
      where: { productId: prod.id, unitCost: { gt: 0 } }, orderBy: { id: 'desc' }, select: { unitCost: true },
    });

    const needName = isDamagedName(prod.name);
    let name = needName ? (old?.name || (twin && !isDamagedName(twin.name) ? twin.name : null)) : null;
    let src = old ? 'RetailPlus' : twin ? 'doublon' : '';
    if (needName && !name && INTERNET) {
      name = await lookupOnline(code);
      if (name) src += ' internet';
    }
    const price = prod.price > 0 ? 0 : (mode(sales.map((s) => s.unitPrice)) || old?.price || twin?.price || 0);
    const costPrice = prod.costPrice > 0 ? 0 : (purchase?.unitCost || old?.costPrice || twin?.costPrice || 0);
    const category = prod.category === STUB || prod.category === 'A VERIFIER' || !prod.category ? (old?.category || twin?.category || null) : null;
    if (sales.length && price) src += ` ${sales.length} ventes`;

    const data = {
      ...(name ? { name } : {}),
      ...(price > 0 ? { price } : {}),
      ...(costPrice > 0 ? { costPrice } : {}),
      ...(category ? { category } : {}),
      ...(old?.brand && !prod.brand ? { brand: old.brand } : {}),
    };
    const stillName = needName && !name;
    const stillPrice = prod.price <= 0 && !price;
    console.log(`${code.padEnd(15)} stock=${String(prod.stock).padStart(4)}  ${name || (needName ? '?? NOM' : prod.name)}  prix=${price || prod.price || '??'}  [${src.trim() || 'rien trouve'}]`);

    if (Object.keys(data).length) {
      fixed++;
      if (APPLY) await p.product.update({ where: { id: prod.id }, data: { ...data, syncStatus: 'pending' } });
    }
    if (stillName || stillPrice) {
      left.push({
        id: prod.id, code, stock: prod.stock,
        name: name || (needName ? '' : prod.name),
        price: price || (prod.price > 0 ? prod.price : ''),
        cost: costPrice || (prod.costPrice > 0 ? prod.costPrice : ''),
        category: category || (prod.category === STUB ? '' : prod.category),
        manque: [stillName && 'nom', stillPrice && 'prix'].filter(Boolean).join(' + '),
      });
    }
  }

  const lines = ['id;code-barres;stock;nom;prix vente;prix achat;categorie;manque']
    .concat(left.map((l) => [l.id, `="${l.code}"`, l.stock, l.name, l.price, l.cost, l.category, l.manque].map(csvCell).join(';')));
  fs.writeFileSync(OUT, '\uFEFF' + lines.join('\r\n'));

  console.log(`\nRetrouves (au moins en partie) : ${fixed}`);
  console.log(`A completer a la main : ${left.length}  -> ${OUT}`);
  console.log(APPLY ? 'TERMINE - enregistre, et sera envoye au cloud a la prochaine synchro.' : 'SIMULATION terminee. Relancez avec --apply pour enregistrer.');
}

main().catch((e) => console.error('ERREUR:', e.message)).finally(() => p.$disconnect());
