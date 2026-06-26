/**
 * Script de RESET — à exécuter avant le go-live
 * 
 * Supprime toutes les données de DÉMO mais garde:
 * - Les caisses (CashRegister)
 * - La licence et la config du magasin
 * - Les employés (à remplacer par les vrais)
 * 
 * Usage:
 *   npx ts-node prisma/reset-demo.ts
 * 
 * ou avec DATABASE_URL override:
 *   DATABASE_URL="..." npx ts-node prisma/reset-demo.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient(
  process.env.DATABASE_URL
    ? { datasources: { db: { url: process.env.DATABASE_URL } } }
    : undefined,
);

async function main() {
  console.log('🧹 Début du reset des données de démo...\n');

  // Ordre important: supprimer les dépendances en premier

  // 1. Transactions et leurs items
  const txCount = await prisma.transaction.count();
  console.log(`  Suppression de ${txCount} transactions...`);
  await prisma.transactionItem.deleteMany();
  await prisma.transaction.deleteMany();

  // 2. Mouvements de stock
  const mvCount = await prisma.stockMovement.count();
  console.log(`  Suppression de ${mvCount} mouvements de stock...`);
  await prisma.stockMovement.deleteMany();

  // 3. Factures
  const invCount = await prisma.invoice.count();
  console.log(`  Suppression de ${invCount} factures...`);
  await prisma.invoicePayment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();

  // 4. Commandes d'achat
  const poCount = await prisma.purchaseOrder.count();
  console.log(`  Suppression de ${poCount} commandes d'achat...`);
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();

  // 5. Shifts (caisses)
  const shiftCount = await prisma.shift.count();
  console.log(`  Suppression de ${shiftCount} shifts...`);
  await prisma.shift.deleteMany();

  // 6. Planning
  const schedCount = await prisma.schedule.count();
  console.log(`  Suppression de ${schedCount} créneaux de planning...`);
  await prisma.schedule.deleteMany();

  // 7. Historique de fidélité
  const loyaltyCount = await prisma.loyaltyHistory.count();
  console.log(`  Suppression de ${loyaltyCount} historiques de fidélité...`);
  await prisma.loyaltyHistory.deleteMany();

  // 8. Clients de démo
  const custCount = await prisma.customer.count();
  console.log(`  Suppression de ${custCount} clients...`);
  await prisma.customer.deleteMany();

  // 9. Produits de démo
  const prodCount = await prisma.product.count();
  console.log(`  Suppression de ${prodCount} produits...`);
  await prisma.product.deleteMany();

  // 10. Fournisseurs de démo
  const supCount = await prisma.supplier.count();
  console.log(`  Suppression de ${supCount} fournisseurs...`);
  await prisma.supplier.deleteMany();

  // 11. Logs de sync
  await prisma.syncLog.deleteMany();

  // GARDER:
  // - CashRegister (caisses)
  // - Employee (employés — à modifier avec les vrais noms)
  // - License + ClientConfig (config du magasin)
  // - Store (magasins)

  console.log('\n✅ Reset terminé!');
  console.log('\nDonnées conservées:');
  const registers = await prisma.cashRegister.count();
  const employees = await prisma.employee.count();
  const licenses = await prisma.license.count();
  console.log(`  - ${registers} caisse(s)`);
  console.log(`  - ${employees} employé(s)`);
  console.log(`  - ${licenses} licence(s)`);
  console.log('\nProchaines étapes:');
  console.log('  1. Modifier les employés avec les vrais noms (module Employés)');
  console.log('  2. Créer les vrais fournisseurs (module Achats)');
  console.log('  3. Importer les vrais produits (module Import → CSV)');
  console.log('  4. Configurer le planning (module Planning)');
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
