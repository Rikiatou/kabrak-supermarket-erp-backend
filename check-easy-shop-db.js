const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const lic = await p.licenseKey.findFirst({
    where: { clientName: { contains: "Easy" } },
    select: { key: true, clientName: true }
  });
  const prod = await p.product.findFirst({
    select: { name: true, price: true, costPrice: true, barcode: true, licenseKey: true }
  });
  const pcount = await p.product.count();
  const ccount = await p.customer.count();
  console.log("License:", JSON.stringify(lic));
  console.log("Sample product:", JSON.stringify(prod));
  console.log("Product count:", pcount);
  console.log("Customer count:", ccount);
}

main().finally(() => p.$disconnect());
