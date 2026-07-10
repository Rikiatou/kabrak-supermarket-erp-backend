/**
 * Sync complète: Local → Cloud (Neon)
 * Copie: employés, produits, config, licences, stores
 * Usage: node sync-local-to-cloud.js
 */
const { PrismaClient } = require('@prisma/client');

const localUrl = 'postgresql://postgres:postgres@localhost:5432/kabrak_local';
const cloudUrl = 'postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const local = new PrismaClient({ datasources: { db: { url: localUrl } } });
const cloud = new PrismaClient({ datasources: { db: { url: cloudUrl } } });

async function syncEmployees() {
  console.log('\n=== SYNC EMPLOYÉS ===');
  const employees = await local.employee.findMany();
  console.log(`Local: ${employees.length} employés`);

  let created = 0, updated = 0;
  for (const emp of employees) {
    // Chercher par employeeNumber dans le cloud
    const existing = await cloud.employee.findFirst({
      where: { employeeNumber: emp.employeeNumber },
    });

    if (existing) {
      // Update
      await cloud.employee.update({
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
          hireDate: emp.hireDate,
        },
      });
      updated++;
    } else {
      // Create avec le même ID
      try {
        await cloud.employee.create({
          data: {
            id: emp.id,
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
        // Si l'ID existe déjà avec un autre employeeNumber, créer sans l'ID
        console.log(`  Conflit ID ${emp.id}, création sans ID...`);
        await cloud.employee.create({
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
      }
    }
  }
  console.log(`  ${created} créés, ${updated} mis à jour`);
}

async function syncProducts() {
  console.log('\n=== SYNC PRODUITS ===');
  // Utiliser $queryRaw pour éviter les problèmes de colonnes manquantes
  const products = await local.$queryRaw`
    SELECT id, name, sku, barcode, category, "costPrice", price, stock, "minStock",
           unit, "expiryDate"
    FROM products LIMIT 50000
  `;
  console.log(`Local: ${products.length} produits`);

  let created = 0, updated = 0, errors = 0;

  for (let i = 0; i < products.length; i++) {
    const prod = products[i];
    try {
      // Chercher par barcode ou sku
      let existing = null;
      if (prod.barcode) {
        existing = await cloud.product.findFirst({ where: { barcode: prod.barcode } });
      }
      if (!existing && prod.sku) {
        existing = await cloud.product.findFirst({ where: { sku: prod.sku } });
      }

      if (existing) {
        await cloud.product.update({
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
        await cloud.product.create({
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
  console.log('\n=== SYNC CONFIG ===');
  const configs = await local.clientConfig.findMany();
  console.log(`Local: ${configs.length} configs`);

  for (const cfg of configs) {
    const existing = await cloud.clientConfig.findFirst({
      where: { licenseId: cfg.licenseId },
    });

    if (existing) {
      await cloud.clientConfig.update({
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
        await cloud.clientConfig.create({ data: cfg });
        console.log(`  Config ${cfg.licenseId} créée`);
      } catch (e) {
        console.log(`  Erreur config: ${e.message}`);
      }
    }
  }
}

async function syncLicenses() {
  console.log('\n=== SYNC LICENCES ===');
  const licenses = await local.license.findMany();
  console.log(`Local: ${licenses.length} licences`);

  for (const lic of licenses) {
    const existing = await cloud.license.findUnique({
      where: { licenseKey: lic.licenseKey },
    });

    if (existing) {
      await cloud.license.update({
        where: { id: existing.id },
        data: {
          clientName: lic.clientName,
          type: lic.type,
          maxStores: lic.maxStores,
          status: lic.status,
          issuedAt: lic.issuedAt,
          expiresAt: lic.expiresAt,
        },
      });
      console.log(`  Licence ${lic.licenseKey} mise à jour`);
    } else {
      try {
        await cloud.license.create({ data: lic });
        console.log(`  Licence ${lic.licenseKey} créée`);
      } catch (e) {
        console.log(`  Erreur licence: ${e.message}`);
      }
    }
  }
}

async function syncCashRegisters() {
  console.log('\n=== SYNC CAISSES ===');
  const registers = await local.cashRegister.findMany();
  console.log(`Local: ${registers.length} caisses`);

  for (const reg of registers) {
    const existing = await cloud.cashRegister.findFirst({
      where: { name: reg.name },
    });

    if (!existing) {
      try {
        await cloud.cashRegister.create({
          data: {
            name: reg.name,
            code: reg.name.replace(/\s/g, '').toLowerCase(),
            location: reg.location,
            status: reg.status,
          },
        });
        console.log(`  Caisse ${reg.name} créée`);
      } catch (e) {
        console.log(`  Erreur caisse: ${e.message}`);
      }
    } else {
      console.log(`  Caisse ${reg.name} existe déjà`);
    }
  }
}

async function main() {
  console.log('========================================');
  console.log('  SYNC LOCAL → CLOUD (Neon)');
  console.log('========================================');
  console.log(`Date: ${new Date().toISOString()}`);

  try {
    await syncEmployees();
    await syncClientConfig();
    await syncLicenses();
    await syncCashRegisters();
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
