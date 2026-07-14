import { PrismaClient } from '@prisma/client';
import { getCurrentTenantId } from './tenant.context';

/**
 * Models that have a tenantId field and should be filtered.
 */
const TENANT_MODELS = [
  'Product',
  'Supplier',
  'Transaction',
  'CashRegister',
  'Shift',
  'Employee',
  'StockMovement',
  'PurchaseOrder',
  'Customer',
  'LoyaltyHistory',
  'SyncLog',
  'Expense',
  'Revenue',
  'Invoice',
  'Schedule',
  'ProductReturn',
  'ProductBatch',
];

/**
 * Prisma extension that automatically:
 * - Filters all findMany/findFirst/findUnique/count by tenantId (when set in context)
 * - Injects tenantId on create/createMany
 * - Prevents cross-tenant updates/deletes
 *
 * When no tenantId is in context (null), no filtering is applied.
 * This allows single-tenant mode (existing data) and super-admin access.
 */
export function applyTenantFilter(prisma: PrismaClient) {
  return prisma.$extends({
    query: {
      $allOperations: ({ model, operation, args, query }) => {
        // Only apply to tenant models
        if (!model || !TENANT_MODELS.includes(model)) {
          return query(args);
        }

        const tenantId = getCurrentTenantId();

        // No tenant in context = no filtering (single-tenant mode, cloud-sync, super-admin)
        if (!tenantId) {
          return query(args);
        }

        // Read operations: inject tenantId into where clause
        if (
          operation === 'findMany' ||
          operation === 'findFirst' ||
          operation === 'findUnique' ||
          operation === 'count' ||
          operation === 'aggregate' ||
          operation === 'groupBy'
        ) {
          if (operation === 'findUnique') {
            // findUnique uses where: { id: ... } - convert to findFirst to add tenantId
            // Actually, let's add tenantId to the where if it's a compound unique
            // For simplicity, we add AND condition
            args.where = { ...args.where, tenantId };
          } else {
            args.where = { ...args.where, tenantId };
          }
        }

        // Create operations: inject tenantId into data
        if (operation === 'create') {
          args.data = { ...args.data, tenantId };
        }

        if (operation === 'createMany') {
          if (Array.isArray(args.data)) {
            args.data = args.data.map((item: any) => ({ ...item, tenantId }));
          } else if (args.data && typeof args.data === 'object') {
            args.data = { ...args.data, tenantId };
          }
        }

        // Upsert: inject tenantId into create and where
        if (operation === 'upsert') {
          args.where = { ...args.where, tenantId };
          args.create = { ...args.create, tenantId };
          if (args.update) {
            // Don't allow changing tenantId on update
            const { tenantId: _, ...updateData } = args.update as any;
            args.update = updateData;
          }
        }

        // Update/delete: add tenantId to where to prevent cross-tenant
        if (operation === 'update' || operation === 'updateMany' || operation === 'delete' || operation === 'deleteMany') {
          args.where = { ...args.where, tenantId };
        }

        return query(args);
      },
    },
  });
}
