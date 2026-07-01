const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Supprimer les transactions liees aux employes
  console.log('Suppression des transactions...');
  const txItems = await prisma.transactionItem.deleteMany({});
  console.log(`  ${txItems.count} items supprimes`);
  const txs = await prisma.transaction.deleteMany({});
  console.log(`  ${txs.count} transactions supprimes`);

  // 2. Supprimer tous les employes existants
  console.log('Suppression des anciens employes...');
  const deleted = await prisma.employee.deleteMany({});
  console.log(`  ${deleted.count} employes supprimes`);

  // 2. Creer les nouveaux employes avec les vrais noms
  const newEmployees = [
    { employeeNumber: 'EMP001', firstName: 'EASY', lastName: 'SHOP', role: 'boss', department: 'Management', pin: '1234', phone: '233332600', status: 'active', hireDate: new Date() },
    { employeeNumber: 'EMP002', firstName: 'MANAGER', lastName: 'EASY SHOP', role: 'manager', department: 'Management', pin: '2345', phone: '233332600', status: 'active', hireDate: new Date() },
    { employeeNumber: 'EMP003', firstName: 'RITA', lastName: 'STOCKIST', role: 'stockist', department: 'Warehouse', pin: '3456', phone: '', status: 'active', hireDate: new Date() },
    { employeeNumber: 'EMP004', firstName: 'BLESSING', lastName: 'CASHIER', role: 'cashier', department: 'Checkout', pin: '4567', phone: '', status: 'active', hireDate: new Date() },
    { employeeNumber: 'EMP005', firstName: 'PELAGIE', lastName: 'CASHIER', role: 'cashier', department: 'Checkout', pin: '5678', phone: '', status: 'active', hireDate: new Date() },
    { employeeNumber: 'EMP006', firstName: 'ACCOUNTANT', lastName: 'EASY SHOP', role: 'accountant', department: 'Accounting', pin: '6789', phone: '', status: 'active', hireDate: new Date() },
  ];

  console.log('\nCreation des nouveaux employes...');
  for (const emp of newEmployees) {
    const created = await prisma.employee.create({ data: emp });
    console.log(`  ${created.employeeNumber} | ${created.firstName} ${created.lastName} | ${created.role} | PIN: ${created.pin}`);
  }

  // 3. Verifier
  const count = await prisma.employee.count();
  console.log(`\nTotal employes: ${count}`);

  // 4. Afficher la liste finale
  const all = await prisma.employee.findMany({ select: { employeeNumber: true, firstName: true, lastName: true, role: true, pin: true } });
  console.log('\n=== EMPLOYES FINAUX ===');
  all.forEach(e => console.log(`  ${e.employeeNumber} | ${e.firstName} ${e.lastName} | ${e.role} | PIN: ${e.pin}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
