import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { applyTenantFilter } from '../tenant/prisma-tenant.extension';

/**
 * PrismaService with multi-tenant filtering via transparent Proxy.
 *
 * Extends PrismaClient for TypeScript type compatibility (so all services
 * that inject PrismaService keep their types). At runtime, a Proxy intercepts
 * property access and delegates to the extended client (with tenant filtering)
 * when available, falling back to the base PrismaClient.
 *
 * This means existing services (this.prisma.product.findMany, etc.)
 * automatically get tenant filtering with ZERO code changes.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private _extended: any;
  private _proxy: any;

  constructor() {
    super({
      datasources: { db: { url: PrismaService.buildUrl() } },
    });

    // Create a proxy that delegates model access to the extended client
    const self = this;
    this._proxy = new Proxy(self, {
      get(target: any, prop: string | symbol, receiver: any) {
        // Priority 1: if extended client is ready and has this property, use it
        // (this ensures tenant filtering is applied to all Prisma model access)
        if (target._extended && prop in target._extended) {
          return target._extended[prop];
        }
        // Priority 2: if property exists on PrismaService itself (methods, etc.)
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }
        // Fall back to base PrismaClient
        return Reflect.get(target, prop, receiver);
      },
    });

    return this._proxy;
  }

  /**
   * Force un pool de connexions suffisant pour l'app principale.
   *
   * POURQUOI: le pool était plafonné à 10 (via DATABASE_URL), ce qui saturait
   * en plein service (plusieurs caisses + comptes simultanés) → erreurs
   * "Timed out fetching a new connection from the connection pool" et l'app
   * paraissait "indisponible" puis revenait. PostgreSQL accepte 100 connexions;
   * le sync a son propre pool (3), donc 25 ici reste largement sous la limite.
   *
   * Configurable via MAIN_DB_POOL / MAIN_DB_POOL_TIMEOUT. Écrase les valeurs
   * éventuellement présentes dans l'URL.
   */
  private static buildUrl(): string {
    const base = process.env.DATABASE_URL || '';
    if (!base) return base;

    const limit = process.env.MAIN_DB_POOL || '25';
    const timeout = process.env.MAIN_DB_POOL_TIMEOUT || '20';
    try {
      const url = new URL(base);
      url.searchParams.set('connection_limit', limit);
      url.searchParams.set('pool_timeout', timeout);
      return url.toString();
    } catch {
      const sep = base.includes('?') ? '&' : '?';
      return `${base}${sep}connection_limit=${limit}&pool_timeout=${timeout}`;
    }
  }

  async onModuleInit() {
    await this.$connect();
    this._extended = applyTenantFilter(this);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
