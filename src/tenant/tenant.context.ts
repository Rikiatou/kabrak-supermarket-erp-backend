import { createNamespace, getNamespace, Namespace } from 'cls-hooked';

const TENANT_NAMESPACE = 'tenant-namespace';
const TENANT_KEY = 'tenantId';

// Ensure namespace exists
function getTenantNamespace(): Namespace<any> | null {
  let ns = getNamespace(TENANT_NAMESPACE);
  if (!ns) {
    ns = createNamespace(TENANT_NAMESPACE);
  }
  return ns;
}

/**
 * Get the current tenantId from the request context (CLS).
 * Returns null if no tenant is set (single-tenant mode, cloud-sync, super-admin).
 */
export function getCurrentTenantId(): string | null {
  const ns = getTenantNamespace();
  if (!ns || !ns.active) return null;
  return ns.get(TENANT_KEY) || null;
}

/**
 * Run a function with a specific tenantId in context.
 * Used for cloud-sync or admin operations that need to set tenant explicitly.
 */
export function runWithTenant<T>(tenantId: string | null, fn: () => T): T {
  const ns = getTenantNamespace();
  if (!ns) return fn();
  let result: T;
  ns.run(() => {
    ns.set(TENANT_KEY, tenantId);
    result = fn();
  });
  return result!;
}

export { getTenantNamespace };
