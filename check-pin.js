const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.employee.findMany({ select: { employeeNumber: true, firstName: true, pin: true, role: true, status: true } })
  .then(r => { console.log(JSON.stringify(r, null, 2)); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); });
