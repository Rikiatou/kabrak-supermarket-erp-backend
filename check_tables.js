const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  // Check if licenses table exists
  try {
    const licenses = await p.$queryRaw`SELECT COUNT(*) as count FROM "licenses"`;
    console.log("Licenses table exists:", JSON.stringify(licenses));
  } catch (e) {
    console.log("Licenses table ERROR:", e.message);
  }
  // Check products
  const products = await p.product.count();
  console.log("Products:", products);
  // Check transactions
  const tx = await p.transaction.count();
  console.log("Transactions:", tx);
  await p.$disconnect();
}
main().catch(e => { console.error("ERROR:", e.message); p.$disconnect(); });
