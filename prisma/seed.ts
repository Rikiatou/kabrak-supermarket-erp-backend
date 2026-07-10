import { PrismaClient } from '@prisma/client';

// Support DATABASE_URL override (pour déploiement)
const prisma = new PrismaClient(
  process.env.DATABASE_URL
    ? {
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      }
    : undefined
);

async function main() {
  console.log('🌱 Début du seed...');

  // Nettoyer la DB
  await prisma.syncLog.deleteMany();
  await prisma.loyaltyHistory.deleteMany();
  await prisma.invoicePayment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.transactionItem.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.cashRegister.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

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
  const grace = await prisma.employee.create({
    data: {
      employeeNumber: 'EMP001',
      firstName: 'Grace',
      lastName: 'Johnson',
      role: 'boss',
      department: 'Management',
      phone: '+237 6 91 23 45 67',
      email: 'g.johnson@kabrak.cm',
      hireDate: new Date('2021-03-15'),
      status: 'active',
      pin: '1234',
    },
  });

  const paul = await prisma.employee.create({
    data: {
      employeeNumber: 'EMP002',
      firstName: 'Paul',
      lastName: 'Mbarga',
      role: 'cashier',
      department: 'Checkout',
      phone: '+237 6 72 34 56 78',
      email: 'p.mbarga@kabrak.cm',
      hireDate: new Date('2022-07-01'),
      status: 'active',
      pin: '2345',
    },
  });

  const esther = await prisma.employee.create({
    data: {
      employeeNumber: 'EMP003',
      firstName: 'Esther',
      lastName: 'Diallo',
      role: 'cashier',
      department: 'Checkout',
      phone: '+237 6 63 45 67 89',
      email: 'e.diallo@kabrak.cm',
      hireDate: new Date('2023-01-10'),
      status: 'active',
      pin: '3456',
    },
  });

  const david = await prisma.employee.create({
    data: {
      employeeNumber: 'EMP004',
      firstName: 'David',
      lastName: 'Bouba',
      role: 'stockist',
      department: 'Warehouse',
      phone: '+237 6 55 67 89 01',
      email: 'd.bouba@kabrak.cm',
      hireDate: new Date('2023-06-01'),
      status: 'active',
      pin: '4567',
    },
  });

  const rebecca = await prisma.employee.create({
    data: {
      employeeNumber: 'EMP005',
      firstName: 'Rebecca',
      lastName: 'Kameni',
      role: 'accountant',
      department: 'Accounting',
      phone: '+237 6 90 12 34 56',
      email: 'r.kameni@kabrak.cm',
      hireDate: new Date('2022-01-15'),
      status: 'active',
      pin: '5678',
    },
  });

  console.log(`✅ 5 employees created (boss, 2 cashiers, stocker, accountant)`);

  // ========================================
  // CAISSES
  // ========================================
  await prisma.cashRegister.create({
    data: {
      name: 'Register 1',
      code: 'REG001',
      status: 'closed',
      openingCash: 50000,
      location: 'Entrée principale',
    },
  });

  await prisma.cashRegister.create({
    data: {
      name: 'Register 2',
      code: 'REG002',
      status: 'closed',
      openingCash: 50000,
      location: 'Entrée principale',
    },
  });

  await prisma.cashRegister.create({
    data: {
      name: 'Register 3',
      code: 'REG003',
      status: 'closed',
      openingCash: 50000,
      location: 'Sortie',
    },
  });

  const caisse4 = await prisma.cashRegister.create({
    data: {
      name: 'Register 4',
      code: 'REG004',
      status: 'closed',
      openingCash: 50000,
      location: 'Sortie',
    },
  });

  console.log(`✅ 4 caisses créées`);

  // ========================================
  // PRODUITS
  // ========================================
  const products = [
    {
      sku: 'HV-5L-001',
      barcode: '0620012345678',
      name: 'Vegetable Oil 5L',
      category: 'Grocery',
      subCategory: 'Oils',
      brand: 'SCTB',
      price: 5500,
      costPrice: 4100,
      stock: 50,
      minStock: 20,
      unit: 'bottle',
      supplierId: sctb.id,
    },
    {
      sku: 'EM-1.5-003',
      barcode: '0610098765432',
      name: 'Mineral Water Source 1.5L',
      category: 'Beverages',
      subCategory: 'Water',
      brand: 'SABC',
      price: 400,
      costPrice: 250,
      stock: 200,
      minStock: 50,
      unit: 'bottle',
      supplierId: sabc.id,
    },
    {
      sku: 'YN-500-012',
      barcode: '0630011223344',
      name: 'Plain Yogurt Candia 500g',
      category: 'Dairy',
      subCategory: 'Yogurt',
      brand: 'Candia',
      price: 1200,
      costPrice: 900,
      stock: 30,
      minStock: 30,
      unit: 'jar',
      expiryDate: new Date('2026-07-02'),
      supplierId: sabc.id,
    },
    {
      sku: 'RIZ-25-002',
      barcode: '0640055667788',
      name: 'Jasmine Rice 25kg',
      category: 'Grocery',
      subCategory: 'Rice',
      brand: 'Import Asie',
      price: 22000,
      costPrice: 17500,
      stock: 42,
      minStock: 15,
      unit: 'bag',
      supplierId: sctb.id,
    },
    {
      sku: 'SAVON-200-008',
      barcode: '0650099887766',
      name: 'Soap Lux 200g',
      category: 'Hygiene',
      subCategory: 'Soap',
      brand: 'Unilever',
      price: 450,
      costPrice: 290,
      stock: 88,
      minStock: 40,
      unit: 'bar',
      supplierId: unilever.id,
    },
    {
      sku: 'BIERE-65-015',
      barcode: '0660012312399',
      name: 'Beer 33 Export 65cl',
      category: 'Beverages',
      subCategory: 'Beer',
      brand: 'SABC',
      price: 900,
      costPrice: 580,
      stock: 120,
      minStock: 60,
      unit: 'bottle',
      supplierId: sabc.id,
    },
    {
      sku: 'PM-K-007',
      barcode: '0670033445566',
      name: 'Whole Wheat Bread',
      category: 'Bakery',
      subCategory: 'Bread',
      brand: 'Central Bakery',
      price: 800,
      costPrice: 480,
      stock: 3,
      minStock: 15,
      unit: 'pack',
    },
    {
      sku: 'POULET-1KG-022',
      barcode: '0680077889900',
      name: 'Frozen Chicken 1kg',
      category: 'Butchery',
      subCategory: 'Poultry',
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

  // Produit avec markdown (yaourt qui expire bientôt)
  const yaourtMarkdown = await prisma.product.create({
    data: {
      sku: 'YN-500-012-MD',
      barcode: '0630011223355',
      name: 'Plain Yogurt Candia 500g (PROMO)',
      category: 'Dairy',
      subCategory: 'Yogurt',
      brand: 'Candia',
      price: 1200,
      costPrice: 900,
      markdownPrice: 500,
      markdownReason: 'expiry',
      markdownNote: 'Expiring soon — clearance',
      markdownStartsAt: new Date(),
      markdownExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      stock: 15,
      minStock: 20,
      unit: 'jar',
      expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // expire dans 5 jours
      supplierId: sabc.id,
    },
  });

  // Produit expiré (pour tester les notifications)
  await prisma.product.create({
    data: {
      sku: 'LAIT-1L-EXP',
      barcode: '0690011226677',
      name: 'Fresh Milk 1L (Expired)',
      category: 'Dairy',
      subCategory: 'Milk',
      brand: 'Candia',
      price: 800,
      costPrice: 550,
      stock: 8,
      minStock: 20,
      unit: 'bottle',
      expiryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // expiré depuis 2 jours
      supplierId: sabc.id,
    },
  });

  console.log(`✅ ${products.length + 2} products created (including 1 markdown, 1 expired)`);

  // ========================================
  // PLANNING DES CAISSES
  // ========================================
  const caisse1 = await prisma.cashRegister.findFirst({ where: { code: 'REG001' } });
  const caisse2 = await prisma.cashRegister.findFirst({ where: { code: 'REG002' } });

  if (caisse1 && caisse2) {
    // Paul: Register 1, Monday to Friday, 8h-17h
    for (let day = 1; day <= 5; day++) {
      await prisma.schedule.create({
        data: {
          employeeId: paul.id,
          registerId: caisse1.id,
          dayOfWeek: day,
          startTime: '08:00',
          endTime: '17:00',
          breakStart: '12:00',
          breakEnd: '13:00',
        },
      });
    }
    // Esther: Register 2, Monday to Saturday, 9h-18h
    for (let day = 1; day <= 6; day++) {
      await prisma.schedule.create({
        data: {
          employeeId: esther.id,
          registerId: caisse2.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '18:00',
          breakStart: '13:00',
          breakEnd: '14:00',
        },
      });
    }
    // Rebecca: Register 3, Tuesday and Thursday (supervision)
    for (const day of [2, 4]) {
      await prisma.schedule.create({
        data: {
          employeeId: rebecca.id,
          registerId: caisse4.id,
          dayOfWeek: day,
          startTime: '10:00',
          endTime: '16:00',
          notes: 'Supervision',
        },
      });
    }
  }

  console.log(`✅ Schedules created (Paul Register 1, Esther Register 2, Rebecca Register 4)`);

  // ========================================
  // TRANSACTIONS (ventes du jour)
  // ========================================
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const allProducts = await prisma.product.findMany();
  const sampleTransactions = [
    { items: [{ idx: 1, qty: 2 }, { idx: 4, qty: 5 }], method: 'cash', cashier: paul.id },
    { items: [{ idx: 5, qty: 3 }, { idx: 0, qty: 1 }], method: 'mobile', cashier: esther.id },
    { items: [{ idx: 2, qty: 4 }, { idx: 3, qty: 1 }], method: 'cash', cashier: paul.id },
    { items: [{ idx: 1, qty: 10 }, { idx: 4, qty: 2 }], method: 'card', cashier: esther.id },
    { items: [{ idx: 6, qty: 2 }], method: 'cash', cashier: paul.id },
  ];

  for (let i = 0; i < sampleTransactions.length; i++) {
    const t = sampleTransactions[i];
    let total = 0;
    const items: any[] = [];
    for (const item of t.items) {
      const p = allProducts[item.idx];
      if (!p) continue;
      const itemTotal = p.price * item.qty;
      total += itemTotal;
      items.push({
        productId: p.id,
        quantity: item.qty,
        unitPrice: p.price,
        discount: 0,
        tax: Math.round(itemTotal * 0.155),
        total: Math.round(itemTotal * 1.155),
      });
    }
    const tax = Math.round(total * 0.155);
    const txnDate = new Date(todayStart.getTime() + i * 3600000);
    const dateStr = txnDate.toISOString().slice(0, 10).replace(/-/g, '');
    await prisma.transaction.create({
      data: {
        transactionNumber: `TXN-${dateStr}-${String(i + 1).padStart(4, '0')}`,
        cashierId: t.cashier,
        registerId: caisse1?.id || caisse2?.id || '',
        items: { create: items },
        subtotal: total,
        tax,
        discount: 0,
        total: total + tax,
        paymentMethod: t.method,
        cashGiven: total + tax,
        change: 0,
        status: 'completed',
        date: txnDate, // chaque heure
      },
    });
  }

  console.log(`✅ ${sampleTransactions.length} transactions créées`);

  // ========================================
  // FACTURE
  // ========================================
  await prisma.invoice.create({
    data: {
      number: 'INV-2026-001',
      clientName: 'Hôtel Mont Fébé',
      clientPhone: '+237 2 22 20 00 00',
      clientEmail: 'achat@montfebe.cm',
      clientAddress: 'Bastos, Yaoundé',
      date: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotal: 250000,
      tax: 38750,
      total: 288750,
      paidAmount: 100000,
      status: 'partial',
      items: {
        create: [
          { description: 'Riz Parfumé 25kg', quantity: 10, unitPrice: 22000, total: 220000 },
          { description: 'Huile Végétale 5L', quantity: 5, unitPrice: 5500, total: 27500 },
        ],
      },
      payments: {
        create: [
          { amount: 100000, method: 'transfer', note: 'Acompte', date: new Date() },
        ],
      },
    },
  });

  // Facture en retard (overdue)
  await prisma.invoice.create({
    data: {
      number: 'INV-2026-002',
      clientName: 'Restaurant Le Wouri',
      clientPhone: '+237 6 99 88 77 66',
      date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // échéance passée
      subtotal: 150000,
      tax: 23250,
      total: 173250,
      paidAmount: 0,
      status: 'overdue',
      items: {
        create: [
          { description: 'Bière 33 Export 65cl (carton 24)', quantity: 20, unitPrice: 7500, total: 150000 },
        ],
      },
    },
  });

  console.log(`✅ 2 factures créées (1 partielle, 1 en retard)`);

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

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  // ========================================
  // LICENCE DE DÉMO + CONFIG CLIENT
  // ========================================
  await prisma.clientConfig.deleteMany();
  await prisma.store.deleteMany();
  await prisma.license.deleteMany();

  const demoExpiresAt = new Date();
  demoExpiresAt.setMonth(demoExpiresAt.getMonth() + 1);

  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe — 1 mois',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 1,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Limbe, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 12,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Limbe',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité à Limbe',
          primaryColor: '#2563eb',
          address: 'Limbe, Cameroun',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop Limbe',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop · Limbe, Cameroun · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Limbe',
            code: 'STORE001',
            address: 'Limbe, Cameroun',
            phone: '+237 6 99 88 77 66',
            city: 'Limbe',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
  const demoLicense = await prisma.license.create({
    data: {
      licenseKey: 'KABRAK-STD-2024-EASYSHOP-DEMO01',
      clientName: 'Easy Shop',
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Carrefour Obili, Yaoundé, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 12,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Yaoundé',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité',
          primaryColor: '#2563eb',
          address: 'Carrefour Obili, Yaoundé',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop SARL · RCCM: CM/YDE/2024/B/123 · N° Contribuable: M0987654321 · Carrefour Obili, Yaoundé · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Bonamoussadi',
            code: 'STORE001',
            address: 'Carrefour Obili, Yaoundé',
            phone: '+237 6 99 88 77 66',
            city: 'Yaoundé',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
      clientEmail: 'contact@easyshop.cm',
      clientPhone: '+237 6 99 88 77 66',
      clientAddress: 'Carrefour Obili, Yaoundé, Cameroun',
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 12,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Yaoundé',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité',
          primaryColor: '#2563eb',
          address: 'Carrefour Obili, Yaoundé',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop SARL · RCCM: CM/YDE/2024/B/123 · N° Contribuable: M0987654321 · Carrefour Obili, Yaoundé · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Bonamoussadi',
            code: 'STORE001',
            address: 'Carrefour Obili, Yaoundé',
            phone: '+237 6 99 88 77 66',
            city: 'Yaoundé',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
      type: 'STANDARD',
      maxStores: 1,
      durationMonths: 12,
      issuedAt: new Date(),
      expiresAt: demoExpiresAt,
      status: 'ACTIVE',
      internalNotes: 'Licence de démonstration — Easy Shop Yaoundé',
      config: {
        create: {
          supermarketName: 'Easy Shop',
          supermarketSlogan: 'Votre supermarché de proximité',
          primaryColor: '#2563eb',
          address: 'Carrefour Obili, Yaoundé',
          phone: '+237 6 99 88 77 66',
          email: 'contact@easyshop.cm',
          website: 'www.easyshop.cm',
          receiptHeader: 'Bienvenue chez Easy Shop!',
          receiptFooter: 'Merci de votre visite! À bientôt chez Easy Shop',
          receiptShowLogo: true,
          invoiceFooter: 'Easy Shop SARL · RCCM: CM/YDE/2024/B/123 · N° Contribuable: M0987654321 · Carrefour Obili, Yaoundé · Tél: +237 6 99 88 77 66',
          currency: 'FCFA',
          taxRate: 15.5,
          enableLoyalty: true,
          enableAutoPrint: false,
        },
      },
      stores: {
        create: [
          {
            name: 'Easy Shop Bonamoussadi',
            code: 'STORE001',
            address: 'Carrefour Obili, Yaoundé',
            phone: '+237 6 99 88 77 66',
            city: 'Yaoundé',
            isActive: true,
          },
        ],
      },
    },
    include: { config: true, stores: true },
  });

  console.log(`✅ Licence de démo créée:`);
  console.log(`   Clé: ${demoLicense.licenseKey}`);
  console.log(`   Client: ${demoLicense.clientName}`);
  console.log(`   Type: ${demoLicense.type}`);
  console.log(`   Expire le: ${demoLicense.expiresAt.toISOString().split('T')[0]}`);
  console.log(`   Magasins: ${demoLicense.stores.length}`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
  console.log('\n🔑 Licence de démo:');
  console.log('   KABRAK-STD-2024-EASYSHOP-DEMO01');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
