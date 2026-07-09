import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
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
