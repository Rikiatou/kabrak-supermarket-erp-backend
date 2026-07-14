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
    super();

    // Create a proxy that delegates model access to the extended client
    const self = this;
    this._proxy = new Proxy(self, {
      get(target: any, prop: string | symbol, receiver: any) {
        // If property exists on PrismaService itself (methods, _extended, etc.)
        if (prop in target) {
          const val = Reflect.get(target, prop, receiver);
          return val;
        }
        // If extended client is ready, use it (has tenant filtering)
        if (target._extended && prop in target._extended) {
          return target._extended[prop];
        }
        // Fall back to base PrismaClient
        return Reflect.get(target, prop, receiver);
      },
    });

    return this._proxy;
  }

  async onModuleInit() {
    await this.$connect();
    this._extended = applyTenantFilter(this);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
