const { PrismaClient } = require('@prisma/client');

const p = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    },
  },
});

async function main() {
  // Fix registerId references
  const fixedReg = await p.$executeRawUnsafe(
    'UPDATE transactions SET "registerId" = NULL WHERE "registerId" IS NOT NULL AND "registerId" NOT IN (SELECT id FROM cash_registers)'
  );
  console.log('Fixed registerId:', fixedReg);

  // Fix cashierId references
  const fixedCashier = await p.$executeRawUnsafe(
    'UPDATE transactions SET "cashierId" = (SELECT id FROM employees LIMIT 1) WHERE "cashierId" NOT IN (SELECT id FROM employees)'
  );
  console.log('Fixed cashierId:', fixedCashier);

  // Fix shifts employeeId
  const fixedShiftEmp = await p.$executeRawUnsafe(
    'UPDATE shifts SET "employeeId" = (SELECT id FROM employees LIMIT 1) WHERE "employeeId" NOT IN (SELECT id FROM employees)'
  ).catch(e => console.log('Shifts emp:', e.message));
  if (typeof fixedShiftEmp === 'number') console.log('Fixed shifts employeeId:', fixedShiftEmp);

  // Fix shifts registerId
  const fixedShiftReg = await p.$executeRawUnsafe(
    'UPDATE shifts SET "registerId" = (SELECT id FROM cash_registers LIMIT 1) WHERE "registerId" NOT IN (SELECT id FROM cash_registers)'
  ).catch(e => console.log('Shifts reg:', e.message));
  if (typeof fixedShiftReg === 'number') console.log('Fixed shifts registerId:', fixedShiftReg);

  // Fix schedules employeeId
  const fixedSched = await p.$executeRawUnsafe(
    'UPDATE schedules SET "employeeId" = (SELECT id FROM employees LIMIT 1) WHERE "employeeId" NOT IN (SELECT id FROM employees)'
  ).catch(e => console.log('Schedules:', e.message));
  if (typeof fixedSched === 'number') console.log('Fixed schedules:', fixedSched);

  // Fix schedules registerId
  const fixedSchedReg = await p.$executeRawUnsafe(
    'UPDATE schedules SET "registerId" = (SELECT id FROM cash_registers LIMIT 1) WHERE "registerId" NOT IN (SELECT id FROM cash_registers)'
  ).catch(e => console.log('Schedules reg:', e.message));
  if (typeof fixedSchedReg === 'number') console.log('Fixed schedules registerId:', fixedSchedReg);

  // Fix transactions cashierId (already done but just in case)
  const fixedTxCashier = await p.$executeRawUnsafe(
    'UPDATE transactions SET "cashierId" = (SELECT id FROM employees LIMIT 1) WHERE "cashierId" NOT IN (SELECT id FROM employees)'
  ).catch(e => console.log('Tx cashier:', e.message));
  if (typeof fixedTxCashier === 'number') console.log('Fixed tx cashierId:', fixedTxCashier);

  // Fix products supplierId
  const fixedProdSupplier = await p.$executeRawUnsafe(
    'UPDATE products SET "supplierId" = NULL WHERE "supplierId" IS NOT NULL AND "supplierId" NOT IN (SELECT id FROM suppliers)'
  ).catch(e => console.log('Products supplier:', e.message));
  if (typeof fixedProdSupplier === 'number') console.log('Fixed products supplierId:', fixedProdSupplier);

  // Fix purchase orders supplierId
  const fixedPOSupplier = await p.$executeRawUnsafe(
    'UPDATE purchase_orders SET "supplierId" = (SELECT id FROM suppliers LIMIT 1) WHERE "supplierId" NOT IN (SELECT id FROM suppliers)'
  ).catch(e => console.log('PO supplier:', e.message));
  if (typeof fixedPOSupplier === 'number') console.log('Fixed PO supplierId:', fixedPOSupplier);

  // Fix invoices customerId
  const fixedInvCust = await p.$executeRawUnsafe(
    'UPDATE invoices SET "customerId" = NULL WHERE "customerId" IS NOT NULL AND "customerId" NOT IN (SELECT id FROM customers)'
  ).catch(e => console.log('Invoice cust:', e.message));
  if (typeof fixedInvCust === 'number') console.log('Fixed invoices customerId:', fixedInvCust);

  // Fix transactions customerId
  const fixedTxCust = await p.$executeRawUnsafe(
    'UPDATE transactions SET "customerId" = NULL WHERE "customerId" IS NOT NULL AND "customerId" NOT IN (SELECT id FROM customers)'
  ).catch(e => console.log('Tx cust:', e.message));
  if (typeof fixedTxCust === 'number') console.log('Fixed tx customerId:', fixedTxCust);

  console.log('DONE');
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
