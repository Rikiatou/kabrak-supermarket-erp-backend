const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check if cashierId column exists
  const columns = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'invoice_payments' AND column_name = 'cashierId'
  `;
  console.log('cashierId exists:', columns.length > 0);
  
  if (columns.length === 0) {
    // Add the column
    await prisma.$executeRaw`ALTER TABLE "invoice_payments" ADD COLUMN "cashierId" TEXT`;
    console.log('cashierId column added!');
    
    // Add index
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "invoice_payments_cashierId_idx" ON "invoice_payments"("cashierId")`;
    console.log('Index created!');
  } else {
    console.log('Column already exists, nothing to do.');
  }
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
