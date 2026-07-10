/**
 * Sync: Cloud (Neon) → Local (Mini PC)
 * Copie: employés, produits, config créés/modifiés sur le cloud vers le local
 * Usage: node sync-cloud-to-local-full.js
 */
const { PrismaClient } = require('@prisma/client');

const localUrl = 'postgresql://postgres:postgres@localhost:5432/kabrak_local';
const cloudUrl = 'postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const local = new PrismaClient({ datasources: { db: { url: localUrl } } });
const cloud = new PrismaClient({ datasources: { db: { url: cloudUrl } } });

async function syncEmployees() {
  console.log('\n=== SYNC EMPLOYÉS (Cloud → Local) ===');
  const employees = await cloud.employee.findMany();
  console.log(`Cloud: ${employees.length} employés`);

  let created = 0, updated = 0;
  for (const emp of employees) {
    const existing = await local.employee.findFirst({
      where: { employeeNumber: emp.employeeNumber },
    });

    if (existing) {
      await local.employee.update({
        where: { id: existing.id },
        data: {
          firstName: emp.firstName,
          lastName: emp.lastName,
          role: emp.role,
          department: emp.department,
          phone: emp.phone,
          email: emp.email,
          pin: emp.pin,
          status: emp.status,
        },
      });
      updated++;
    } else {
      try {
        await local.employee.create({
          data: {
            employeeNumber: emp.employeeNumber,
            firstName: emp.firstName,
            lastName: emp.lastName,
            role: emp.role,
            department: emp.department,
            phone: emp.phone,
            email: emp.email,
            pin: emp.pin,
            status: emp.status,
            hireDate: emp.hireDate,
          },
        });
        created++;
      } catch (e) {
        console.log(`  Erreur employé ${emp.employeeNumber}: ${e.message}`);
      }
    }
  }
  console.log(`  ${created} créés, ${updated} mis à jour`);
}

async function syncProducts() {
  console.log('\n=== SYNC PRODUITS (Cloud → Local) ===');
  const products = await cloud.$queryRaw`
    SELECT id, name, sku, barcode, category, "costPrice", price, stock, "minStock",
           unit, "expiryDate"
    FROM products LIMIT 50000
  `;
  console.log(`Cloud: ${products.length} produits`);

  let created = 0, updated = 0, errors = 0;
  for (let i = 0; i < products.length; i++) {
    const prod = products[i];
    try {
      let existing = null;
      if (prod.barcode) {
        existing = await local.product.findFirst({ where: { barcode: prod.barcode } });
      }
      if (!existing && prod.sku) {
        existing = await local.product.findFirst({ where: { sku: prod.sku } });
      }

      if (existing) {
        await local.product.update({
          where: { id: existing.id },
          data: {
            name: prod.name,
            category: prod.category,
            price: prod.price,
            costPrice: prod.costPrice,
            stock: prod.stock,
            minStock: prod.minStock,
            unit: prod.unit,
            barcode: prod.barcode,
            sku: prod.sku,
            expiryDate: prod.expiryDate,
          },
        });
        updated++;
      } else {
        await local.product.create({
          data: {
            name: prod.name,
            category: prod.category,
            price: prod.price,
            costPrice: prod.costPrice || 0,
            stock: prod.stock,
            minStock: prod.minStock || 0,
            unit: prod.unit || 'pc',
            barcode: prod.barcode,
            sku: prod.sku || `SKU-${i}`,
            expiryDate: prod.expiryDate,
          },
        });
        created++;
      }
    } catch (e) {
      errors++;
    }
    if (i % 1000 === 0 && i > 0) console.log(`  Progression: ${i}/${products.length}...`);
  }
  console.log(`  ${created} créés, ${updated} mis à jour, ${errors} erreurs`);
}

async function syncClientConfig() {
  console.log('\n=== SYNC CONFIG (Cloud → Local) ===');
  const configs = await cloud.clientConfig.findMany();
  console.log(`Cloud: ${configs.length} configs`);

  for (const cfg of configs) {
    const existing = await local.clientConfig.findFirst({
      where: { licenseId: cfg.licenseId },
    });

    if (existing) {
      await local.clientConfig.update({
        where: { id: existing.id },
        data: {
          supermarketName: cfg.supermarketName,
          supermarketSlogan: cfg.supermarketSlogan,
          logoUrl: cfg.logoUrl,
          primaryColor: cfg.primaryColor,
          address: cfg.address,
          phone: cfg.phone,
          currency: cfg.currency,
          taxRate: cfg.taxRate,
          receiptFooter: cfg.receiptFooter,
          receiptShowLogo: cfg.receiptShowLogo,
          enableLoyalty: cfg.enableLoyalty,
        },
      });
      console.log(`  Config ${cfg.licenseId} mise à jour`);
    } else {
      try {
        await local.clientConfig.create({ data: cfg });
        console.log(`  Config ${cfg.licenseId} créée`);
      } catch (e) {
        console.log(`  Erreur config: ${e.message}`);
      }
    }
  }
}

async function syncCustomers() {
  console.log('\n=== SYNC CLIENTS (Cloud → Local) ===');
  const customers = await cloud.customer.findMany();
  console.log(`Cloud: ${customers.length} clients`);

  let created = 0, updated = 0;
  for (const cust of customers) {
    const existing = await local.customer.findFirst({
      where: { phone: cust.phone },
    });

    if (existing) {
      await local.customer.update({
        where: { id: existing.id },
        data: {
          name: cust.name,
          phone: cust.phone,
          email: cust.email,
          points: cust.points,
          totalSpent: cust.totalSpent,
        },
      });
      updated++;
    } else {
      try {
        await local.customer.create({
          data: {
            name: cust.name,
            phone: cust.phone,
            email: cust.email,
            points: cust.points || 0,
            totalSpent: cust.totalSpent || 0,
          },
        });
        created++;
      } catch (e) {
        // ignore
      }
    }
  }
  console.log(`  ${created} créés, ${updated} mis à jour`);
}

async function main() {
  console.log('========================================');
  console.log('  SYNC CLOUD → LOCAL (Mini PC)');
  console.log('========================================');
  console.log(`Date: ${new Date().toISOString()}`);

  try {
    await syncEmployees();
    await syncClientConfig();
    await syncCustomers();
    await syncProducts();

    console.log('\n========================================');
    console.log('  SYNC TERMINÉ AVEC SUCCÈS');
    console.log('========================================');
  } catch (e) {
    console.error('\nERREUR:', e.message);
    console.error(e.stack);
  } finally {
    await local.$disconnect();
    await cloud.$disconnect();
  }
}

main();
