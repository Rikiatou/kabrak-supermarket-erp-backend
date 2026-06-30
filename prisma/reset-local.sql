-- Reset DB locale — tout vider sauf licenses et stores
BEGIN;
SET CONSTRAINTS ALL DEFERRED;
TRUNCATE TABLE transaction_items CASCADE;
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE stock_movements CASCADE;
TRUNCATE TABLE invoice_items CASCADE;
TRUNCATE TABLE invoice_payments CASCADE;
TRUNCATE TABLE invoices CASCADE;
TRUNCATE TABLE loyalty_history CASCADE;
TRUNCATE TABLE customers CASCADE;
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
TRUNCATE TABLE suppliers CASCADE;
COMMIT;

SELECT 'products' as t, COUNT(*) FROM products
UNION ALL SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL SELECT 'employees', COUNT(*) FROM employees
UNION ALL SELECT 'suppliers', COUNT(*) FROM suppliers
UNION ALL SELECT 'licenses', COUNT(*) FROM licenses
UNION ALL SELECT 'stores', COUNT(*) FROM stores;
