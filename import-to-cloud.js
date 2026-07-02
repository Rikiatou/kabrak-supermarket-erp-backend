/**
 * IMPORT VERS LE CLOUD — à lancer sur votre PC
 * 
 * Usage: node import-to-cloud.js kabrak-export-2026-07-01.json
 * 
 * Ce script:
 * 1. Lit le fichier JSON exporté du serveur local du client
 * 2. Mappe les employés locaux vers les employés du cloud
 *    (ex: BLESSING BLESSING → BLESSING EKOLI)
 * 3. Importe les transactions et shifts dans le cloud
 * 4. Évite les doublons (vérifie par transactionNumber)
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const cloudUrl = 'postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const prisma = new PrismaClient({ datasources: { db: { url: cloudUrl } } });

// Mapping des employés: ID local → ID cloud
// À ajuster selon les employés trouvés
const EMPLOYEE_MAP = {
  // BLESSING BLESSING (local dup) → BLESSING EKOLI (cloud real)
  'cmr1t087v001i8lql54f4f0vf': 'cmr0gtp7r004gnot7vewzxnhp',
  // Ajoutez d'autres mappings ici si besoin
  // 'local-id': 'cloud-id',
};

async function main() {
  const filename = process.argv[2];
  if (!filename) {
    console.log('Usage: node import-to-cloud.js <fichier-export.json>');
    process.exit(1);
  }

  const filepath = path.isAbsolute(filename) ? filename : path.join(__dirname, filename);
  if (!fs.existsSync(filepath)) {
    console.error(`Fichier introuvable: ${filepath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  console.log(`=== IMPORT ${data.dateRange.start} → ${data.dateRange.end} ===\n`);

  // 1. Charger les employés du cloud
  const cloudEmps = await prisma.employee.findMany();
  console.log(`Employés cloud: ${cloudEmps.length}`);
  cloudEmps.forEach(e => console.log(`  ${e.employeeNumber} | ${e.firstName} ${e.lastName} | ${e.role} | ${e.id}`));

  // 2. Construire le mapping automatique par nom
  const localEmps = data.employees;
  const autoMap = {};
  
  for (const local of localEmps) {
    // Chercher un employé cloud avec le même nom
    const exactMatch = cloudEmps.find(c => 
      c.firstName.toLowerCase() === local.firstName.toLowerCase() &&
      c.lastName.toLowerCase() === local.lastName.toLowerCase()
    );
    
    if (exactMatch) {
      autoMap[local.id] = exactMatch.id;
      console.log(`  MAP: ${local.firstName} ${local.lastName} → ${exactMatch.firstName} ${exactMatch.lastName} (exact)`);
    } else {
      // Chercher par rôle si même rôle et nom similaire
      const sameRole = cloudEmps.filter(c => c.role === local.role);
      if (sameRole.length === 1) {
        autoMap[local.id] = sameRole[0].id;
        console.log(`  MAP: ${local.firstName} ${local.lastName} → ${sameRole[0].firstName} ${sameRole[0].lastName} (by role: ${local.role})`);
      } else if (EMPLOYEE_MAP[local.id]) {
        autoMap[local.id] = EMPLOYEE_MAP[local.id];
        const target = cloudEmps.find(c => c.id === EMPLOYEE_MAP[local.id]);
        console.log(`  MAP: ${local.firstName} ${local.lastName} → ${target?.firstName} ${target?.lastName} (manual)`);
      } else {
        console.log(`  ⚠️ NO MAP for ${local.firstName} ${local.lastName} (${local.id}) — role: ${local.role}`);
        // List candidates
        sameRole.forEach(c => console.log(`    candidate: ${c.firstName} ${c.lastName} (${c.id})`));
      }
    }
  }

  // 3. Importer les shifts
  console.log(`\n--- Shifts ---`);
  let shiftsImported = 0;
  let shiftsSkipped = 0;
  for (const s of data.shifts) {
    const mappedEmpId = autoMap[s.employeeId] || s.employeeId;
    // Vérifier si le shift existe déjà
    const existing = await prisma.shift.findUnique({ where: { id: s.id } }).catch(() => null);
    if (existing) {
      console.log(`  SKIP shift ${s.id} (existe déjà)`);
      shiftsSkipped++;
      continue;
    }
    await prisma.shift.create({
      data: {
        id: s.id,
        registerId: s.registerId,
        registerName: s.registerName,
        employeeId: mappedEmpId,
        employeeName: s.employeeName,
        openingCash: s.openingCash,
        closingCash: s.closingCash,
        expectedCash: s.expectedCash,
        difference: s.difference,
        openedAt: new Date(s.openedAt),
        closedAt: s.closedAt ? new Date(s.closedAt) : null,
        status: s.status,
        notes: s.notes,
      },
    });
    console.log(`  ✓ Shift ${s.id} importé (emp: ${mappedEmpId})`);
    shiftsImported++;
  }

  // 4. Importer les transactions
  console.log(`\n--- Transactions ---`);
  let txImported = 0;
  let txSkipped = 0;
  let itemsImported = 0;
  for (const t of data.transactions) {
    const mappedCashierId = autoMap[t.cashierId] || t.cashierId;
    
    // Vérifier si la transaction existe déjà (par transactionNumber)
    const existing = await prisma.transaction.findFirst({
      where: { transactionNumber: t.transactionNumber },
    });
    if (existing) {
      console.log(`  SKIP ${t.transactionNumber} (existe déjà)`);
      txSkipped++;
      continue;
    }

    // Créer la transaction
    const created = await prisma.transaction.create({
      data: {
        id: t.id,
        transactionNumber: t.transactionNumber,
        date: new Date(t.date),
        subtotal: t.subtotal,
        discount: t.discount,
        tax: t.tax,
        total: t.total,
        paymentMethod: t.paymentMethod,
        cashGiven: t.cashGiven,
        change: t.change,
        cashierId: mappedCashierId,
        registerId: t.registerId,
        status: t.status,
        licenseKey: t.licenseKey,
      },
    });

    // Importer les items
    for (const item of t.items) {
      await prisma.transactionItem.create({
        data: {
          id: item.id,
          transactionId: created.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          discount: item.discount,
        },
      }).catch(() => {
        // Item might already exist or product might not exist in cloud
      });
      itemsImported++;
    }

    console.log(`  ✓ ${t.transactionNumber} | ${t.total} | ${t.paymentMethod} | cashier=${mappedCashierId}`);
    txImported++;
  }

  console.log(`\n=== RÉSUMÉ ===`);
  console.log(`  Shifts: ${shiftsImported} importés, ${shiftsSkipped} ignorés`);
  console.log(`  Transactions: ${txImported} importées, ${txSkipped} ignorées`);
  console.log(`  Items: ${itemsImported} importés`);
  console.log(`\nLes transactions sont maintenant dans le cloud.`);
  console.log(`Le Z-Report journalier les affichera pour la date ${data.dateRange.start}.`);
}

main().then(() => process.exit(0)).catch(e => { console.error('Erreur:', e.message); process.exit(1); });
