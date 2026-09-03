import { Injectable } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth() {
    // Vérifie RÉELLEMENT la connexion à PostgreSQL (pas juste "ok" statique).
    // Permet de diagnostiquer les coupures DB qui rendent l'app "indisponible".
    let database: 'ok' | 'unavailable' = 'unavailable';
    let dbError: string | null = null;
    let activeConnections: number | null = null;
    let maxConnections: number | null = null;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'ok';

      // Nombre de connexions Postgres actives vs max — détecte la saturation.
      try {
        const rows = await this.prisma.$queryRaw<Array<{ active: bigint; max_conn: string }>>`
          SELECT (SELECT count(*) FROM pg_stat_activity) AS active,
                 current_setting('max_connections') AS max_conn`;
        if (rows && rows[0]) {
          activeConnections = Number(rows[0].active);
          maxConnections = Number(rows[0].max_conn);
        }
      } catch { /* stats non critiques */ }
    } catch (e: any) {
      dbError = e?.message?.slice(0, 200) || 'unknown';
    }

    return {
      status: database === 'ok' ? 'ok' : 'degraded',
      backend: 'ok',
      database,
      dbError,
      activeConnections,
      maxConnections,
      timestamp: new Date().toISOString(),
      service: 'Kabrak Backend API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      sync: process.env.SYNC_ENABLED === 'true' ? 'enabled' : 'disabled',
    };
  }
}
