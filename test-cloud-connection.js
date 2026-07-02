const { PrismaClient } = require('@prisma/client');
const cloudUrl = "postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require";
const cloud = new PrismaClient({ datasources: { db: { url: cloudUrl } } });

async function main() {
  console.log('Connecting to cloud...');
  await cloud.$connect();
  console.log('CONNECTED!');
  const count = await cloud.product.count();
  console.log('Products on cloud:', count);
  await cloud.$disconnect();
}
main().catch(e => console.log('ERROR:', e.message));
