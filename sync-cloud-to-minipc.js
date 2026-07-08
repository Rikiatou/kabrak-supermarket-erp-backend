/**
 * Sync Cloud (Neon) → Mini PC (192.168.100.10)
 * 1. Push missing products
 * 2. Update stock levels
 * Via API du mini PC
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const cloud = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require' } },
});

const MINI_PC = 'http://192.168.100.10:3001';
let TOKEN = '';

async function login() {
  const r = await fetch(`${MINI_PC}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeNumber: 'EMP001', pin: '1234' }),
  });
  const d = await r.json();
  TOKEN = d.token;
  console.log('Logged in to mini PC');
}

async function api(method, endpoint, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${MINI_PC}/api${endpoint}`, opts);
  return r;
}

async function getAllMiniPCProducts() {
  const all = [];
  let page = 1;
  while (true) {
    const r = await api('GET', `/products?page=${page}&limit=500`);
    const d = await r.json();
    const items = d.data || [];
    all.push(...items);
    if (items.length < 500 || page > 50) break;
    page++;
  }
  return all;
}

(async () => {
  await login();

  // 1. Get all products from both
  console.log('\n=== LOADING DATA ===');
  const cloudProds = await cloud.product.findMany();
  console.log(`Cloud: ${cloudProds.length} produits`);

  const miniPCProds = await getAllMiniPCProducts();
  console.log(`Mini PC: ${miniPCProds.length} produits`);

  const miniPCbarcodes = new Map();
  miniPCProds.forEach(p => miniPCbarcodes.set(p.barcode, p));

  // 2. Push missing products to mini PC
  const missing = cloudProds.filter(p => !miniPCbarcodes.has(p.barcode));
  console.log(`\n=== PRODUITS MANQUANTS: ${missing.length} ===`);

  let created = 0, errors = 0;
  for (const p of missing) {
    try {
      const r = await api('POST', '/products', {
        name: p.name,
        barcode: p.barcode,
        sku: p.sku || p.barcode,
        category: p.category || 'GENERAL',
        unit: p.unit || 'pièce',
        price: p.price,
        costPrice: p.costPrice || 0,
        stock: p.stock,
        minStock: p.minStock || 10,
      });
      if (r.ok) {
        created++;
        if (created % 20 === 0) console.log(`  ${created}/${missing.length} créés...`);
      } else {
        const err = await r.json().catch(() => ({}));
        // If SKU conflict, try with modified SKU
        if (r.status === 409 || (err.message && err.message.includes('exist'))) {
          const r2 = await api('POST', '/products', {
            name: p.name,
            barcode: p.barcode,
            sku: p.barcode + '-C' + Date.now(),
            category: p.category || 'GENERAL',
            unit: p.unit || 'pièce',
            price: p.price,
            costPrice: p.costPrice || 0,
            stock: p.stock,
            minStock: p.minStock || 10,
            isActive: true,
          });
          if (r2.ok) { created++; }
          else { errors++; console.log(`  ! ${p.name}: ${r.status}`); }
        } else {
          errors++;
          if (errors <= 5) console.log(`  ! ${p.name}: ${err.message || r.status}`);
        }
      }
    } catch (e) {
      errors++;
      if (errors <= 5) console.log(`  ! ${p.name}: ${e.message.substring(0, 60)}`);
    }
  }
  console.log(`Créés: ${created}, Erreurs: ${errors}`);

  // 3. Update stock for products that exist in both but have different stock
  console.log('\n=== MISE A JOUR STOCK ===');
  let updated = 0, stockErrors = 0;
  // Only update where cloud has MORE stock (RITA added stock on cloud today)
  for (const cp of cloudProds) {
    const mp = miniPCbarcodes.get(cp.barcode);
    if (!mp) continue;
    if (cp.stock <= mp.stock) continue; // Cloud has less or equal - mini PC is more up to date (sales)

    try {
      const r = await api('PATCH', `/products/${mp.id}`, {
        stock: cp.stock,
      });
      if (r.ok) {
        updated++;
        if (updated <= 20 || updated % 50 === 0) {
          console.log(`  + ${cp.name} | ${mp.stock} → ${cp.stock} (+${cp.stock - mp.stock})`);
        }
      } else {
        stockErrors++;
      }
    } catch (e) {
      stockErrors++;
    }
  }
  console.log(`Stock mis à jour: ${updated}, Erreurs: ${stockErrors}`);

  // 4. Sync purchase orders from cloud
  console.log('\n=== BONS DE COMMANDE ===');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cloudPOs = await cloud.purchaseOrder.findMany({
    where: { createdAt: { gte: today } },
    include: { items: true },
  });
  console.log(`Bons de commande cloud aujourdhui: ${cloudPOs.length}`);

  // Final summary
  console.log('\n=== RESUME ===');
  console.log(`Produits créés: ${created}`);
  console.log(`Stock mis à jour: ${updated}`);
  console.log(`Erreurs: ${errors + stockErrors}`);

  process.exit(0);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
