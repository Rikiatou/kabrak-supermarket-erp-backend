import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seed...');

  // Nettoyer la DB
  await prisma.syncLog.deleteMany();
  await prisma.loyaltyHistory.deleteMany();
  await prisma.transactionItem.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.cashRegister.deleteMany();
  await prisma.supplier.deleteMany();

  // ========================================
  // FOURNISSEURS
  // ========================================
  const sabc = await prisma.supplier.create({
    data: {
      name: 'SABC',
      contact: 'Direction Commerciale',
      phone: '+237 2 22 23 30 00',
      email: 'commercial@sabc.cm',
      address: 'Route de Bonabéri, Douala',
      paymentTerms: '30 jours',
      rating: 4.8,
    },
  });

  const unilever = await prisma.supplier.create({
    data: {
      name: 'Unilever CMR',
      contact: 'Dept. Distribution',
      phone: '+237 2 33 42 00 00',
      email: 'distribution@unilever.cm',
      address: 'Zone Industrielle, Douala',
      paymentTerms: '15 jours',
      rating: 4.5,
    },
  });

  const sctb = await prisma.supplier.create({
    data: {
      name: 'SCTB Cameroun',
      contact: 'Service Client',
      phone: '+237 6 77 88 99 00',
      email: 'ventes@sctb.cm',
      address: 'Marché Central, Yaoundé',
      paymentTerms: 'Comptant',
      rating: 4.2,
    },
  });

  console.log(`✅ 3 fournisseurs créés`);

  // ========================================
  // EMPLOYÉS
  // ========================================
  const amina = await prisma.employee.create({
    data: {
      employeeNumber: 'EMP001',
      firstName: 'Amina',
      lastName: 'Bello',
      role: 'manager',
      department: 'Direction',
      phone: '+237 6 91 23 45 67',
      email: 'a.bello@kabrak.cm',
      hireDate: new Date('2021-03-15'),
      status: 'active',
      pin: '1234',
    },
  });

  const jeanPaul = await prisma.employee.create({
    data: {
      employeeNumber: 'EMP002',
      firstName: 'Jean-Paul',
      lastName: 'Mbarga',
      role: 'cashier',
      department: 'Caisse',
      phone: '+237 6 72 34 56 78',
      email: 'jp.mbarga@kabrak.cm',
      hireDate: new Date('2022-07-01'),
      status: 'active',
      pin: '2345',
    },
  });

  const fatou = await prisma.employee.create({
    data: {
      employeeNumber: 'EMP003',
      firstName: 'Fatou',
      lastName: 'Diallo',
      role: 'cashier',
      department: 'Caisse',
      phone: '+237 6 63 45 67 89',
      email: 'f.diallo@kabrak.cm',
      hireDate: new Date('2023-01-10'),
      status: 'active',
      pin: '3456',
    },
  });

  console.log(`✅ 3 employés créés`);

  // ========================================
  // CAISSES
  // ========================================
  await prisma.cashRegister.create({
    data: {
      name: 'Caisse 1',
      code: 'REG001',
      status: 'closed',
      openingCash: 50000,
      location: 'Entrée principale',
    },
  });

  await prisma.cashRegister.create({
    data: {
      name: 'Caisse 2',
      code: 'REG002',
      status: 'closed',
      openingCash: 50000,
      location: 'Entrée principale',
    },
  });

  await prisma.cashRegister.create({
    data: {
      name: 'Caisse 3',
      code: 'REG003',
      status: 'closed',
      openingCash: 50000,
      location: 'Sortie',
    },
  });

  console.log(`✅ 3 caisses créées`);

  // ========================================
  // PRODUITS
  // ========================================
  const products = [
    {
      sku: 'HV-5L-001',
      barcode: '0620012345678',
      name: 'Huile Végétale 5L',
      category: 'Épicerie',
      subCategory: 'Huiles',
      brand: 'SCTB',
      price: 5500,
      costPrice: 4100,
      stock: 50,
      minStock: 20,
      unit: 'bouteille',
      supplierId: sctb.id,
    },
    {
      sku: 'EM-1.5-003',
      barcode: '0610098765432',
      name: 'Eau Minérale Source 1.5L',
      category: 'Boissons',
      subCategory: 'Eaux',
      brand: 'SABC',
      price: 400,
      costPrice: 250,
      stock: 200,
      minStock: 50,
      unit: 'bouteille',
      supplierId: sabc.id,
    },
    {
      sku: 'YN-500-012',
      barcode: '0630011223344',
      name: 'Yaourt Nature Candia 500g',
      category: 'Produits laitiers',
      subCategory: 'Yaourts',
      brand: 'Candia',
      price: 1200,
      costPrice: 900,
      stock: 30,
      minStock: 30,
      unit: 'pot',
      expiryDate: new Date('2026-07-02'),
      supplierId: sabc.id,
    },
    {
      sku: 'RIZ-25-002',
      barcode: '0640055667788',
      name: 'Riz Parfumé 25kg',
      category: 'Épicerie',
      subCategory: 'Riz',
      brand: 'Import Asie',
      price: 22000,
      costPrice: 17500,
      stock: 42,
      minStock: 15,
      unit: 'sac',
      supplierId: sctb.id,
    },
    {
      sku: 'SAVON-200-008',
      barcode: '0650099887766',
      name: 'Savon Lux 200g',
      category: 'Hygiène',
      subCategory: 'Savons',
      brand: 'Unilever',
      price: 450,
      costPrice: 290,
      stock: 88,
      minStock: 40,
      unit: 'barre',
      supplierId: unilever.id,
    },
    {
      sku: 'BIERE-65-015',
      barcode: '0660012312399',
      name: 'Bière 33 Export 65cl',
      category: 'Boissons',
      subCategory: 'Bières',
      brand: 'SABC',
      price: 900,
      costPrice: 580,
      stock: 120,
      minStock: 60,
      unit: 'bouteille',
      supplierId: sabc.id,
    },
    {
      sku: 'PM-K-007',
      barcode: '0670033445566',
      name: 'Pain de Mie Komplet',
      category: 'Boulangerie',
      subCategory: 'Pains',
      brand: 'Boulangerie Centrale',
      price: 800,
      costPrice: 480,
      stock: 3,
      minStock: 15,
      unit: 'paquet',
    },
    {
      sku: 'POULET-1KG-022',
      barcode: '0680077889900',
      name: 'Poulet Congelé 1kg',
      category: 'Boucherie',
      subCategory: 'Volailles',
      brand: 'Fermex',
      price: 3800,
      costPrice: 2900,
      stock: 25,
      minStock: 10,
      unit: 'kg',
    },
  ];

  for (const product of products) {
    await prisma.product.create({ data: product });
  }

  console.log(`✅ ${products.length} produits créés`);

  // ========================================
  // CLIENT FIDÉLITÉ
  // ========================================
  await prisma.customer.create({
    data: {
      customerNumber: 'CLI001',
      firstName: 'Marie',
      lastName: 'Tchoumi',
      phone: '+237 6 99 11 22 33',
      email: 'marie.tchoumi@email.cm',
      points: 250,
      totalSpent: 25000,
      tier: 'silver',
    },
  });

  console.log(`✅ 1 client créé`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
