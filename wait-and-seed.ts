import { PrismaClient } from '@prisma/client';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

async function waitForNeon(maxRetries = 10) {
  console.log('⏳ Attente du réveil de Neon...');
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Neon est prêt!');
      await prisma.$disconnect();
      return true;
    } catch (error) {
      console.log(`   Tentative ${i + 1}/${maxRetries}... (attente 5s)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.error('❌ Neon ne répond toujours pas après', maxRetries * 5, 'secondes');
  return false;
}

waitForNeon().then(ready => {
  if (ready) {
    console.log('\n🚀 Lancement du seed...\n');
    const { execSync } = require('child_process');
    execSync('npx ts-node prisma/seed.ts', { 
      stdio: 'inherit', 
      env: { ...process.env, DATABASE_URL } 
    });
  } else {
    process.exit(1);
  }
});
