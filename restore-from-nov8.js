// Restaure nom/prix/catégorie/coût des 35 produits abîmés depuis la copie du 8 nov (port 5433).
// La copie du 8 novembre est postérieure à leur création (7 nov) et antérieure à l'écrasement (11 nov).
//   node restore-from-nov8.js          -> compare et montre ce qui serait restauré
//   node restore-from-nov8.js apply    -> applique
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const live = new PrismaClient();
const old = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL.replace(/:(\d+)\//, ':5433/') } } });
const APPLY = process.argv.includes('apply');

const IDS = [
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
];

async function main() {
  const bad = await live.product.findMany({
    where: {
      OR: [
        { id: { in: IDS } },
        { name: 'Pending sync' }, { name: { startsWith: 'A RENOMMER' } }, { sku: { startsWith: 'STUB-' } },
      ],
    },
  });
  console.log(`Fiches a restaurer: ${bad.length}${APPLY ? '' : '  (SIMULATION)'}`);
  const missed = [];
  for (const b of bad) {
    const o = await old.product.findUnique({ where: { id: b.id } });
    if (!o || o.name === 'Pending sync' || !o.name) { missed.push(b.barcode); console.log(`${b.barcode} -> absent de la copie du 8`); continue; }
    console.log(`${b.barcode}  "${b.name}" ${b.price}F  ->  "${o.name}" ${o.price}F (${o.category})`);
    if (APPLY) {
      await live.product.update({
        where: { id: b.id },
        data: {
          name: o.name, description: o.description, category: o.category, subCategory: o.subCategory,
          brand: o.brand, price: o.price, costPrice: o.costPrice, wholesalePrice: o.wholesalePrice,
          packQuantity: o.packQuantity, packBarcode: o.packBarcode, unit: o.unit,
          minStock: o.minStock, supplierId: o.supplierId, expiryDate: o.expiryDate,
          syncStatus: 'pending',
        },
      });
    }
  }
  console.log(`\nRestaures: ${bad.length - missed.length}/${bad.length}${APPLY ? '' : ' — relance avec apply'}`);
  if (missed.length) console.log('Non trouves dans la copie:', missed);
}

main().catch((e) => console.error('ERREUR:', e.message)).finally(async () => { await live.$disconnect(); await old.$disconnect(); });
