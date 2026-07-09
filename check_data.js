const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const products = await p.product.count();
  console.log("Products:", products);
  const customers = await p.customer.count();
  console.log("Customers:", customers);
  const transactions = await p.transaction.count();
  console.log("Transactions:", transactions);
  const suppliers = await p.supplier.count();
  console.log("Suppliers:", suppliers);
  // Check if new columns exist
  const sample = await p.product.findFirst({ select: { id: true, name: true, wholesalePrice: true, packQuantity: true } });
  console.log("Sample product (wholesalePrice/packQuantity):", JSON.stringify(sample));
  await p.$disconnect();
}
main().catch(e => { console.error("ERROR:", e.message); p.$disconnect(); });
