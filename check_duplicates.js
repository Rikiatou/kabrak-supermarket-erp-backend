// check_duplicates.js — Lance avec: node check_duplicates.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check(model, fields, label) {
  try {
    const rows = await prisma[model].groupBy({
      by: fields,
      _count: { _all: true },
      having: { _count: { _all: { gt: 1 } } },
      take: 10,
    });
    if (rows.length > 0) {
      console.log(`❌ ${label}: ${rows.length} doublon(s)`);
      rows.forEach(r => console.log(`   ${JSON.stringify(r)}`));
    } else {
      console.log(`✅ ${label}: OK`);
    }
  } catch (e) {
    console.log(`⚠️  ${label}: ${e.message}`);
  }
}

async function main() {
  console.log('=== Verification doublons mini-PC ===\n');

  await check('product', ['tenantId', 'sku'], 'Products [tenantId, sku]');
  await check('product', ['tenantId', 'barcode'], 'Products [tenantId, barcode]');
  await check('transaction', ['tenantId', 'transactionNumber'], 'Transactions [tenantId, transactionNumber]');
  await check('cashRegister', ['tenantId', 'code'], 'CashRegisters [tenantId, code]');
  await check('employee', ['tenantId', 'employeeNumber'], 'Employees [tenantId, employeeNumber]');
  await check('customer', ['tenantId', 'customerNumber'], 'Customers [tenantId, customerNumber]');
  await check('customer', ['tenantId', 'phone'], 'Customers [tenantId, phone]');
  await check('invoice', ['tenantId', 'number'], 'Invoices [tenantId, number]');
  await check('purchaseOrder', ['tenantId', 'orderNumber'], 'PurchaseOrders [tenantId, orderNumber]');

  // Check empty strings (would conflict in unique constraint)
  try {
    const emptyBarcode = await prisma.product.count({ where: { barcode: '' } });
    const emptySku = await prisma.product.count({ where: { sku: '' } });
    if (emptyBarcode > 0) console.log(`⚠️  Products avec barcode vide (""): ${emptyBarcode}`);
    if (emptySku > 0) console.log(`⚠️  Products avec sku vide (""): ${emptySku}`);
    if (emptyBarcode === 0 && emptySku === 0) console.log('✅ Pas de barcode/sku vide');
  } catch (e) {
    console.log(`⚠️  Check empty: ${e.message}`);
  }

  console.log('\n=== FIN ===');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
