import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔌 Test de connexion à Neon...');
    console.log('URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));
    
    await prisma.$connect();
    console.log('✅ Connexion réussie!');
    
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('📊 PostgreSQL version:', result);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
    process.exit(1);
  }
}

testConnection();
