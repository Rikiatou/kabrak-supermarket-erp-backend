/**
 * EXPORT LOCAL TRANSACTIONS — à lancer sur le serveur local du client
 * 
 * Usage: node export-local-sales.js 2026-07-01
 *        node export-local-sales.js 2026-07-01 2026-07-05
 * 
 * Ce script exporte toutes les transactions (et leurs items) 
 * pour une date ou une plage de dates, vers un fichier JSON.
 * 
 * Ensuite, copiez le fichier JSON sur votre PC et lancez:
 *   node import-to-cloud.js <fichier.json>
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const startDate = process.argv[2];
  const endDate = process.argv[3] || startDate;

  if (!startDate) {
    console.log('Usage: node export-local-sales.js 2026-07-01 [2026-07-05]');
    process.exit(1);
  }

  const dayStart = new Date(`${startDate}T00:00:00.000`);
  const dayEnd = new Date(`${endDate}T23:59:59.999`);

  console.log(`Export des transactions du ${startDate} au ${endDate}...`);

  // 1. Employés locaux
  const employees = await prisma.employee.findMany();
  console.log(`Employés locaux: ${employees.length}`);
  employees.forEach(e => console.log(`  ${e.employeeNumber} | ${e.firstName} ${e.lastName} | ${e.role} | ${e.id}`));

  // 2. Transactions
  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: dayStart, lte: dayEnd } },
    include: {
      items: true,
    },
    orderBy: { date: 'asc' },
  });

  console.log(`\nTransactions trouvées: ${transactions.length}`);

  // 3. Shifts
  const shifts = await prisma.shift.findMany({
    where: {
      OR: [
        { openedAt: { gte: dayStart, lte: dayEnd } },
        { closedAt: { gte: dayStart, lte: dayEnd } },
      ],
    },
  });
  console.log(`Shifts trouvés: ${shifts.length}`);

  // 4. Construire l'export
  const exportData = {
    exportDate: new Date().toISOString(),
    dateRange: { start: startDate, end: endDate },
    employees: employees.map(e => ({
      id: e.id,
      employeeNumber: e.employeeNumber,
      firstName: e.firstName,
      lastName: e.lastName,
      role: e.role,
    })),
    shifts: shifts.map(s => ({
      id: s.id,
      registerId: s.registerId,
      registerName: s.registerName,
      employeeId: s.employeeId,
      employeeName: s.employeeName,
      openingCash: s.openingCash,
      closingCash: s.closingCash,
      expectedCash: s.expectedCash,
      difference: s.difference,
      openedAt: s.openedAt,
      closedAt: s.closedAt,
      status: s.status,
      notes: s.notes,
    })),
    transactions: transactions.map(t => ({
      id: t.id,
      transactionNumber: t.transactionNumber,
      date: t.date,
      subtotal: t.subtotal,
      discount: t.discount,
      tax: t.tax,
      total: t.total,
      paymentMethod: t.paymentMethod,
      cashGiven: t.cashGiven,
      change: t.change,
      cashierId: t.cashierId,
      registerId: t.registerId,
      status: t.status,
      licenseKey: t.licenseKey,
      items: t.items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        discount: item.discount,
      })),
    })),
  };

  // 5. Sauvegarder
  const filename = `kabrak-export-${startDate}${endDate !== startDate ? '-to-' + endDate : ''}.json`;
  const filepath = path.join(__dirname, filename);
  fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
  
  console.log(`\n✓ Export sauvegardé: ${filepath}`);
  console.log(`  Taille: ${(fs.statSync(filepath).size / 1024).toFixed(1)} KB`);
  console.log(`  Transactions: ${transactions.length}`);
  console.log(`  Items: ${transactions.reduce((s, t) => s + t.items.length, 0)}`);
  console.log(`\nCopiez ce fichier sur votre PC puis lancez:`);
  console.log(`  node import-to-cloud.js ${filename}`);
}

main().then(() => process.exit(0)).catch(e => { console.error('Erreur:', e.message); process.exit(1); });
