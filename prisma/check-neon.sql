SELECT 'products' as tbl, COUNT(*) as cnt FROM products
UNION ALL SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL SELECT 'stockMovements', COUNT(*) FROM stock_movements
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'suppliers', COUNT(*) FROM suppliers
UNION ALL SELECT 'employees', COUNT(*) FROM employees
UNION ALL SELECT 'cashRegisters', COUNT(*) FROM cash_registers
UNION ALL SELECT 'shifts', COUNT(*) FROM shifts
UNION ALL SELECT 'losses', COUNT(*) FROM expenses
UNION ALL SELECT 'users', COUNT(*) FROM stores;
