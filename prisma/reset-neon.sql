-- Reset all transactional data on Neon cloud DB for real use
-- Keep: stores (users), licenses, client_configs
-- Clear: everything else

BEGIN;

-- Disable FK checks temporarily
SET CONSTRAINTS ALL DEFERRED;

-- Clear transactional data
TRUNCATE TABLE transaction_items CASCADE;
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE stock_movements CASCADE;
TRUNCATE TABLE invoice_items CASCADE;
TRUNCATE TABLE invoice_payments CASCADE;
TRUNCATE TABLE invoices CASCADE;
TRUNCATE TABLE customers CASCADE;
TRUNCATE TABLE loyalty_history CASCADE;
TRUNCATE TABLE suppliers CASCADE;
TRUNCATE TABLE purchase_order_items CASCADE;
TRUNCATE TABLE purchase_orders CASCADE;
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE employees CASCADE;
TRUNCATE TABLE schedules CASCADE;
TRUNCATE TABLE cash_registers CASCADE;
TRUNCATE TABLE shifts CASCADE;
TRUNCATE TABLE expenses CASCADE;
TRUNCATE TABLE revenues CASCADE;
TRUNCATE TABLE sync_logs CASCADE;

-- Reset auto-increment sequences
SELECT setval(pg_get_serial_sequence('products', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('transactions', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('stock_movements', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('invoices', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('customers', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('suppliers', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('employees', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('cash_registers', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('shifts', 'id'), 1, false);

COMMIT;

-- Verify
SELECT 'products' as tbl, COUNT(*) as cnt FROM products
UNION ALL SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL SELECT 'stockMovements', COUNT(*) FROM stock_movements
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'suppliers', COUNT(*) FROM suppliers
UNION ALL SELECT 'employees', COUNT(*) FROM employees
UNION ALL SELECT 'cashRegisters', COUNT(*) FROM cash_registers
UNION ALL SELECT 'shifts', COUNT(*) FROM shifts
UNION ALL SELECT 'stores(users)', COUNT(*) FROM stores;
