-- Reset all transactional data to 0 for clean cloud test
DELETE FROM "transaction_items";
DELETE FROM "transactions";
DELETE FROM "stock_movements";
DELETE FROM "shifts";
DELETE FROM "invoice_payments";
DELETE FROM "invoice_items";
DELETE FROM "invoices";
-- Reset product stock to 0 for clean inventory
UPDATE "products" SET "stock" = 0;
