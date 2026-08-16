import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaClient DÉDIÉ à la synchronisation cloud.
 *
 * POURQUOI un client séparé ?
 * Le cycle de sync exécute des milliers de requêtes et peut durer plusieurs
 * minutes. Avec un pool partagé (9 connexions par défaut sur le mini-PC), il
 * affamait le pool et les requêtes du POS (/products, /transactions, ...)
 * échouaient avec "Timed out fetching a new connection from the connection pool"
 * → HTTP 500 côté caisse.
 *
 * Ici le sync a son propre pool RÉDUIT (SYNC_DB_POOL, défaut 3). Il ne peut
 * donc JAMAIS consommer les connexions réservées aux requêtes des caisses.
 *
 * Note: pas d'extension multi-tenant. Le sync tourne dans un timer, hors
 * contexte de requête, donc `getCurrentTenantId()` renvoyait déjà null et
 * aucun filtre n'était appliqué. Comportement identique, isolation en plus.
 */
@Injectable()
export class SyncPrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      datasources: { db: { url: SyncPrismaService.buildUrl() } },
    });
  }

  /**
   * Force un petit pool + un pool_timeout court sur l'URL du sync.
   * Si l'URL contient déjà ces paramètres, ils sont écrasés.
   */
  private static buildUrl(): string {
    const base = process.env.DATABASE_URL || '';
    if (!base) return base;

    const limit = process.env.SYNC_DB_POOL || '3';
    try {
      const url = new URL(base);
      url.searchParams.set('connection_limit', limit);
      url.searchParams.set('pool_timeout', '30');
      return url.toString();
    } catch {
      // URL non parsable (rare) — fallback en concaténation simple
      const sep = base.includes('?') ? '&' : '?';
      return `${base}${sep}connection_limit=${limit}&pool_timeout=30`;
    }
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
