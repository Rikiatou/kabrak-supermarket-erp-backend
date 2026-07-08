const { PrismaClient } = require('@prisma/client');
const cloud = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require' }
  }
});

async function main() {
  const product = await cloud.product.findFirst({ where: { barcode: '6921199136322' } });
  console.log('Cloud result:', JSON.stringify(product, null, 2));
  await cloud.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
