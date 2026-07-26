-- Migration: Multi-tenant unique keys
-- Generated from diff between schema.backup-20260726-020019.prisma and schema.prisma
-- This migration has already been applied via `prisma db push` to the cloud database.
-- Kept for reference and for applying to other environments (local mini-PC, etc.)

-- DropIndex (remove global unique constraints)
DROP INDEX IF EXISTS "products_sku_key";
DROP INDEX IF EXISTS "products_barcode_key";
DROP INDEX IF EXISTS "transactions_transactionNumber_key";
DROP INDEX IF EXISTS "cash_registers_code_key";
DROP INDEX IF EXISTS "employees_employeeNumber_key";
DROP INDEX IF EXISTS "purchase_orders_orderNumber_key";
DROP INDEX IF EXISTS "customers_customerNumber_key";
DROP INDEX IF EXISTS "customers_phone_key";
DROP INDEX IF EXISTS "invoices_number_key";
DROP INDEX IF EXISTS "stores_code_key";

-- CreateIndex (composite unique constraints scoped by tenantId)
CREATE UNIQUE INDEX IF NOT EXISTS "products_tenantId_sku_key" ON "products"("tenantId", "sku");
CREATE UNIQUE INDEX IF NOT EXISTS "products_tenantId_barcode_key" ON "products"("tenantId", "barcode");
CREATE UNIQUE INDEX IF NOT EXISTS "transactions_tenantId_transactionNumber_key" ON "transactions"("tenantId", "transactionNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "cash_registers_tenantId_code_key" ON "cash_registers"("tenantId", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "employees_tenantId_employeeNumber_key" ON "employees"("tenantId", "employeeNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_orders_tenantId_orderNumber_key" ON "purchase_orders"("tenantId", "orderNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "customers_tenantId_customerNumber_key" ON "customers"("tenantId", "customerNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "customers_tenantId_phone_key" ON "customers"("tenantId", "phone");
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_tenantId_number_key" ON "invoices"("tenantId", "number");
CREATE UNIQUE INDEX IF NOT EXISTS "stores_licenseId_code_key" ON "stores"("licenseId", "code");
