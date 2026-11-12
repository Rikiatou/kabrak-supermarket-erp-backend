// Teste la copie du 8 nov (port 5433) : catalogue + lecture products.
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:postgres@localhost:5433/kabrak_local' } } });
async function main() {
  try {
    const r = await p.$queryRawUnsafe("select relname, relfilenode from pg_class where relname in ('products','transactions','employees','stock_movements')");
    console.log('catalog:', JSON.stringify(r));
    const c = await p.$queryRawUnsafe('select count(*) n from products');
    console.log('products count:', JSON.stringify(c));
    const s = await p.$queryRawUnsafe("select barcode, name, price from products where barcode in ('612479240995','6176000129295','6934933804432') limit 5");
    console.log('sample:', JSON.stringify(s, null, 1));
  } catch (e) {
    console.log('ERR:', e.message.split('\n')[0]);
  } finally {
    await p.$disconnect();
  }
}
main();
