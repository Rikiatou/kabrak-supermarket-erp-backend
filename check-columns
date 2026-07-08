const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // List all columns in invoice_payments
  const columns = await prisma.$queryRaw`
    SELECT column_name, data_type FROM information_schema.columns 
    WHERE table_name = 'invoice_payments'
    ORDER BY ordinal_position
  `;
  console.log('Columns in invoice_payments:');
  for (const c of columns) {
    console.log(`  - ${c.column_name} (${c.data_type})`);
  }
  
  // Also check if the table exists with exact case
  const tables = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables 
    WHERE table_name LIKE '%invoice%' OR table_name LIKE '%payment%'
  `;
  console.log('\nTables matching invoice/payment:');
  for (const t of tables) {
    console.log(`  - ${t.table_name}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
