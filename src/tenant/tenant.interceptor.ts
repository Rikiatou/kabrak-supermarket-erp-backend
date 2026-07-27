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
 *   1. JWT user.tenantId (authenticated — most secure)
 *   2. X-Tenant-Id header (for pre-auth calls like listCashiers on login page)
 *   3. null (single-tenant mode, cloud-sync, super-admin)
 *
 * SECURITY: When authenticated, the JWT tenantId ALWAYS wins over the header.
 * This prevents a user from accessing another tenant's data by sending a
 * fake X-Tenant-Id header.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    let tenantId: string | null = null;

    // Priority 1: from JWT user (authenticated — secure)
    if (request.user?.tenantId) {
      tenantId = request.user.tenantId;
    }

    // Priority 2: explicit header (only when NOT authenticated — e.g. login page listCashiers)
    if (!tenantId) {
      const headerTenant = request.headers['x-tenant-id'] as string;
      if (headerTenant) {
        tenantId = headerTenant;
      }
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
