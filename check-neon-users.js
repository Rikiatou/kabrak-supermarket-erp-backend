const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const employees = await p.employee.count();
  console.log('Employees:', employees);
  const products = await p.product.count();
  console.log('Products:', products);
  const transactions = await p.transaction.count();
  console.log('Transactions:', transactions);
  const emp = await p.employee.findFirst();
  console.log('First employee:', emp ? `${emp.firstName} ${emp.lastName} (${emp.role})` : 'NONE');
  await p.$disconnect();
}
main().catch(e => { console.error(e); p.$disconnect(); });
