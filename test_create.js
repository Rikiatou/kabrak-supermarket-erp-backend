const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  // Try creating a test product
  try {
    const product = await p.product.create({
      data: {
        sku: "TEST-" + Date.now(),
        barcode: "TEST-" + Date.now(),
        name: "Test Product Debug",
        category: "Grocery",
        price: 500,
        costPrice: 300,
        stock: 0,
        minStock: 10,
        unit: "pc",
        taxRate: 0,
        isActive: true,
        expiryDate: new Date("2026-12-31"),
      },
    });
    console.log("SUCCESS: Created product", product.id, product.name);
    // Delete it
    await p.product.delete({ where: { id: product.id } });
    console.log("Cleaned up test product");
  } catch (e) {
    console.log("ERROR:", e.message);
    console.log("CODE:", e.code);
  }
  await p.$disconnect();
}
main();
