const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check employee licenseKeys
  const employees = await prisma.employee.findMany({
    select: { id: true, employeeNumber: true, firstName: true, lastName: true, role: true, status: true, licenseKey: true },
  });
  console.log('=== LOCAL EMPLOYEES WITH LICENSE KEY ===');
  employees.forEach(e => console.log(`  ${e.employeeNumber} | ${e.firstName} ${e.lastName} | role=${e.role} | status=${e.status} | licenseKey=${e.licenseKey}`));
}

main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
