import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaClient } from '@prisma/client';

// Auto-migrate tenantId on cloud startup (one-time fix for existing data)
async function autoMigrateTenantId() {
  if (process.env.SKIP_TENANT_MIGRATION === 'true') return;

  const prisma = new PrismaClient();
  try {
    // Find the first license with a subdomain set
    const license = await prisma.license.findFirst({
      where: { subdomain: { not: null } },
    });
    if (!license) {
      await prisma.$disconnect();
      return;
    }

    const tenantId = license.id;
    let migrated = 0;

    // Update all records that have null tenantId
    const models = [
      'product', 'supplier', 'transaction', 'cash_register', 'shift',
      'employee', 'stock_movement', 'purchase_order', 'customer',
      'expense', 'revenue', 'invoice', 'schedule', 'return',
      'loyalty_history', 'product_batch',
    ];

    for (const model of models) {
      try {
        const result = await (prisma as any)[model].updateMany({
          where: { tenantId: null },
          data: { tenantId },
        });
        if (result.count > 0) {
          migrated += result.count;
          console.log(`  [tenant-migration] ${model}: ${result.count} records`);
        }
      } catch (e) {
        // Some models might not have tenantId, skip
      }
    }

    if (migrated > 0) {
      console.log(`✅ [tenant-migration] Migrated ${migrated} records to tenant ${license.subdomain}`);
    }
  } catch (e) {
    console.error('[tenant-migration] Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

async function bootstrap() {
  // Run tenant migration before app starts (on cloud)
  if (process.env.CLOUD_API_KEY) {
    await autoMigrateTenantId();
  }

  const app = await NestFactory.create(AppModule);

  // CORS dynamique: accepter les origins configurés + tous les sous-domaines vercel.app
  const configuredOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3001')
    .split(',')
    .map((o) => o.trim());

  const corsOrigin = (origin: string | undefined, callback: (err: Error | null, ok?: boolean) => void) => {
    // Autoriser les requêtes sans origin (mobile apps, curl, postman)
    if (!origin) return callback(null, true);

    // Origins explicitement configurés
    if (configuredOrigins.includes(origin)) return callback(null, true);

    // Tous les sous-domaines de vercel.app (preview deployments)
    if (origin.endsWith('.vercel.app')) return callback(null, true);

    // Tous les sous-domaines de kabrak-retail.com (app, tenants, etc.)
    if (origin.endsWith('.kabrak-retail.com') || origin === 'https://kabrak-retail.com') {
      return callback(null, true);
    }

    // Localhost en dev
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }

    // Réseau local (LAN) — caisses sur le même réseau (192.168.x, 10.x, 172.16-31.x)
    if (/^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    // Rejeter le reste
    return callback(new Error(`Origin not allowed: ${origin}`), false);
  };

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Prefix API
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Kabrak Backend démarré sur http://0.0.0.0:${port}/api`);
  console.log(`📊 Prisma Studio: npx prisma studio`);
  console.log(`🔄 Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS: ${configuredOrigins.join(', ')} + *.vercel.app + localhost`);
}

bootstrap();
