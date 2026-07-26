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
      $allOperations: async ({ model, operation, args, query }) => {
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
            // findUnique n'accepte que les champs uniques dans where.
            // Ajouter tenantId casserait l'appel. On convertit en findFirst
            // pour pouvoir filtrer par tenantId en plus de la clé unique.
            return (prisma as any)[model].findFirst({
              ...args,
              where: { ...args.where, tenantId },
            });
          }
          args.where = { ...args.where, tenantId };
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

        // Upsert: inject tenantId into create; for where, convert to findFirst+update/create
        // to avoid Prisma rejecting non-unique fields in upsert's where clause.
        if (operation === 'upsert') {
          // upsert's where only accepts unique fields. Adding tenantId breaks it.
          // Strategy: do a findFirst by the original where + tenantId, then update or create.
          const existing = await (prisma as any)[model!].findFirst({
            where: { ...args.where, tenantId },
            select: { id: true },
          });
          args.create = { ...args.create, tenantId };
          if (args.update) {
            const { tenantId: _, ...updateData } = args.update as any;
            args.update = updateData;
          }
          if (existing) {
            return (prisma as any)[model!].update({
              where: { id: existing.id },
              data: args.update,
              ...((args as any).include ? { include: (args as any).include } : {}),
            });
          }
          return (prisma as any)[model!].create({
            data: args.create,
            ...((args as any).include ? { include: (args as any).include } : {}),
          });
        }

        // Update/delete: prevent cross-tenant access
        if (operation === 'updateMany' || operation === 'deleteMany') {
          // updateMany/deleteMany accept non-unique where → safe to add tenantId
          args.where = { ...args.where, tenantId };
        } else if (operation === 'update' || operation === 'delete') {
          // update/delete only accept unique fields in where → adding tenantId breaks.
          // Verify the record belongs to the tenant first via findFirst.
          const existing = await (prisma as any)[model!].findFirst({
            where: { ...args.where, tenantId },
            select: { id: true },
          });
          if (!existing) {
            // Not found or cross-tenant → return null (Prisma returns null for not-found on update/delete with throwOnNotFound=false)
            // For update, Prisma throws by default; returning null mimics "not found"
            return null as any;
          }
          // Now safe to update/delete by id
          args.where = { id: existing.id };
        }

        return query(args);
      },
    },
  });
}
