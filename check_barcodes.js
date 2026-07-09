const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  // Get 5 products with barcodes
  const products = await p.product.findMany({
    where: { barcode: { not: "" } },
    select: { id: true, name: true, barcode: true, stock: true },
    take: 5,
  });
  console.log("Sample products with barcodes:");
  products.forEach(pr => console.log(`  ${pr.barcode} | ${pr.name} | stock: ${pr.stock}`));

  // Count products with null/empty barcode
  const nullBarcode = await p.product.count({ where: { OR: [{ barcode: null }, { barcode: "" }] } });
  console.log("\nProducts with null/empty barcode:", nullBarcode);

  const totalProducts = await p.product.count();
  console.log("Total products:", totalProducts);

  await p.$disconnect();
}
main().catch(e => { console.error("ERROR:", e.message); p.$disconnect(); });
