import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { getTenantNamespace } from './tenant.context';

/**
 * Interceptor that sets the tenantId in the request context.
 * Runs AFTER the AuthGuard, so req.user is available.
 *
 * Priority:
 *   1. X-Tenant-Id header (explicit tenant routing)
 *   2. JWT user.tenantId
 *   3. null (single-tenant mode, cloud-sync, super-admin)
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    let tenantId: string | null = null;

    // Priority 1: explicit header
    const headerTenant = request.headers['x-tenant-id'] as string;
    if (headerTenant) {
      tenantId = headerTenant;
    }

    // Priority 2: from JWT user (set by AuthGuard)
    if (!tenantId && request.user?.tenantId) {
      tenantId = request.user.tenantId;
    }

    // Set tenant in CLS context
    const ns = getTenantNamespace();
    if (ns) {
      // If already in a namespace, just set the value
      if (ns.active) {
        ns.set('tenantId', tenantId);
      } else {
        // Create a new namespace context
        return new Observable((subscriber) => {
          ns.run(() => {
            ns.set('tenantId', tenantId);
            next.handle().subscribe({
              next: (val) => subscriber.next(val),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete(),
            });
          });
        });
      }
    }

    return next.handle();
  }
}
