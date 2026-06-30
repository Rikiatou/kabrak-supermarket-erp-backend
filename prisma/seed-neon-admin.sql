-- Créer / mettre à jour le compte Boss de Easy Shop dans Neon
-- Numéro: EMP001  |  PIN: 1234  |  Rôle: boss

INSERT INTO employees (
  id, "employeeNumber", "firstName", "lastName",
  role, department, phone, email,
  "hireDate", status, pin,
  "createdAt", "updatedAt"
) VALUES (
  'emp-boss-easyshop-001',
  'EMP001',
  'Patron',
  'Easy Shop',
  'boss',
  'Direction',
  '000000000',
  'boss@easyshop.cm',
  NOW(),
  'active',
  '1234',
  NOW(),
  NOW()
)
ON CONFLICT ("employeeNumber") DO UPDATE
  SET
    "firstName" = 'Patron',
    "lastName"  = 'Easy Shop',
    role        = 'boss',
    department  = 'Direction',
    pin         = '1234',
    status      = 'active',
    "updatedAt" = NOW();

-- Vérification
SELECT "employeeNumber", "firstName", "lastName", role, pin, status FROM employees;
