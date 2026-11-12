// Vérifie ce que le cloud contient pour les 35 produits abîmés.
// Interroge /cloud-sync/pull page par page et affiche nom/prix/catégorie.
//   node check-cloud-35.js
require('dotenv').config();

const IDS = new Set([
  'cmwaxs4bs1ewzpzidzzs0f2z8', 'cmwaxwlmu1extpzidrmxzjuof', 'cmwayy8e11f3xpzidmwrex98u',
  'cmwaze6xc1f65pzidesqf0q9v', 'cmwazrqyi1f7cpzidbwp5z445', 'cmwazf7b71f67pzid4qixaw3t',
  'cmwazttb41f7epzidxsgu5lxd', 'cmwaz5ufi1f4ipzidacp0igvj', 'cmwaz6h961f4kpzidr8j10y8v',
  'cmwaz9k041f4mpzidw5fqlpj0', 'cmwayx7rg1f3vpzidkilcjrqv', 'cmwbwvg561fvnpzid3tzl0560',
  'cmwc5ex4a1gq4pzid7u1notna', 'cmw6ir9bd18iupzidssnhdll4', 'cmw6iydy518kdpzidj8u43w6j',
  'cmw7pbrle1a9mpzidpaij5ihd', 'cmw6j6k6f18ldpzid5me9v9bl', 'cmw6ms8nv18yypzidkzjctabs',
  'cmw6mj41g18x3pzidji7y7umf', 'cmw6mnl2918yppzidf0vfs6bi', 'cmw6mm1dp18y4pzidr109ziiv',
  'cmw6pgctt19bzpziduupzi0xx', 'cmw7kcv7q19fmpzidrqdwox5n', 'cmw7kvs9w19ggpzidq4s0h6h4',
  'cmw7ku75a19gepzid51ykoxs5', 'cmw7oylom1a6opzid38f1hgan', 'cmw7pdr4a1a9opzidcte41h1y',
  'cmw7p7lba1a8zpzidyjrfuf5c', 'cmw7p519b1a8dpzidhv5z0j3c', 'cmw7ozf5n1a70pzidd4is9ptb',
  'cmw7p198e1a7mpzidwiisam83', 'cmw7p3l7l1a7opzidorvxc8fa', 'cmw6pc4fy19bvpzid4ae22tli',
  'cmw7kyar119gipzid3fuhukz9', 'cmw6pey2819bxpziduhsmdqds',
]);

async function main() {
  const base = process.env.CLOUD_API_URL;
  const key = process.env.CLOUD_API_KEY;
  if (!base || !key) { console.log('CLOUD_API_URL/CLOUD_API_KEY absents du .env'); return; }

  const found = new Map();
  let offset = 0;
  const PAGE = 500;
  for (;;) {
    const url = `${base}/cloud-sync/pull?since=${encodeURIComponent('2020-01-01T00:00:00.000Z')}&productsLimit=${PAGE}&productsOffset=${offset}`;
    const res = await fetch(url, { headers: { 'x-api-key': key } });
    if (!res.ok) { console.log(`HTTP ${res.status} page ${offset}`); break; }
    const data = await res.json();
    const products = data.products || [];
    for (const p of products) if (IDS.has(p.id)) found.set(p.id, p);
    console.log(`page offset=${offset}: ${products.length} produits (cumul trouvés: ${found.size}/35)`);
    if (!data.productsHasMore || products.length === 0) break;
    offset += products.length;
  }

  console.log('\n=== Fiches trouvées sur le cloud ===');
  for (const [id, p] of found) {
    const real = p.name && p.name !== 'Pending sync' && !(p.sku || '').startsWith('STUB-');
    console.log(`${real ? 'VRAI ' : 'STUB '} ${p.barcode || '?'}  "${p.name}"  ${p.price}F  cost=${p.costPrice}  cat=${p.category}`);
  }
  const missing = [...IDS].filter((i) => !found.has(i));
  if (missing.length) console.log(`\nAbsents du cloud: ${missing.length} ids`);
}
main().catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
