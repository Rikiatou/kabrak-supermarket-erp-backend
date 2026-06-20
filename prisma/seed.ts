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
      role: 'boss',
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

  const omarou = await prisma.employee.create({
    data: {
      employeeNumber: 'EMP004',
      firstName: 'Omarou',
      lastName: 'Bouba',
      role: 'stockist',
      department: 'Magasin',
      phone: '+237 6 55 67 89 01',
      email: 'o.bouba@kabrak.cm',
      hireDate: new Date('2023-06-01'),
      status: 'active',
      pin: '4567',
    },
  });

  const sophie = await prisma.employee.create({
    data: {
      employeeNumber: 'EMP005',
      firstName: 'Sophie',
      lastName: 'Kameni',
      role: 'accountant',
      department: 'Comptabilité',
      phone: '+237 6 90 12 34 56',
      email: 's.kameni@kabrak.cm',
      hireDate: new Date('2022-01-15'),
      status: 'active',
      pin: '5678',
    },
  });

  console.log(`✅ 5 employés créés (boss, 2 caissiers, stocker, accountant)`);

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

  const caisse4 = await prisma.cashRegister.create({
    data: {
      name: 'Caisse 4',
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

  // Produit avec markdown (yaourt qui expire bientôt)
  const yaourtMarkdown = await prisma.product.create({
    data: {
      sku: 'YN-500-012-MD',
      barcode: '0630011223355',
      name: 'Yaourt Nature Candia 500g (PROMO)',
      category: 'Produits laitiers',
      subCategory: 'Yaourts',
      brand: 'Candia',
      price: 1200,
      costPrice: 900,
      markdownPrice: 500,
      markdownReason: 'expiry',
      markdownNote: 'Expire bientôt — destockage',
      markdownStartsAt: new Date(),
      markdownExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      stock: 15,
      minStock: 20,
      unit: 'pot',
      expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // expire dans 5 jours
      supplierId: sabc.id,
    },
  });

  // Produit expiré (pour tester les notifications)
  await prisma.product.create({
    data: {
      sku: 'LAIT-1L-EXP',
      barcode: '0690011226677',
      name: 'Lait Frais 1L (Expiré)',
      category: 'Produits laitiers',
      subCategory: 'Laits',
      brand: 'Candia',
      price: 800,
      costPrice: 550,
      stock: 8,
      minStock: 20,
      unit: 'bouteille',
      expiryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // expiré depuis 2 jours
      supplierId: sabc.id,
    },
  });

  console.log(`✅ ${products.length + 2} produits créés (dont 1 en markdown, 1 expiré)`);

  // ========================================
  // PLANNING DES CAISSES
  // ========================================
  const caisse1 = await prisma.cashRegister.findFirst({ where: { code: 'REG001' } });
  const caisse2 = await prisma.cashRegister.findFirst({ where: { code: 'REG002' } });

  if (caisse1 && caisse2) {
    // Jean-Paul: Caisse 1, lundi à vendredi, 8h-17h
    for (let day = 1; day <= 5; day++) {
      await prisma.schedule.create({
        data: {
          employeeId: jeanPaul.id,
          registerId: caisse1.id,
          dayOfWeek: day,
          startTime: '08:00',
          endTime: '17:00',
          breakStart: '12:00',
          breakEnd: '13:00',
        },
      });
    }
    // Fatou: Caisse 2, lundi à samedi, 9h-18h
    for (let day = 1; day <= 6; day++) {
      await prisma.schedule.create({
        data: {
          employeeId: fatou.id,
          registerId: caisse2.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '18:00',
          breakStart: '13:00',
          breakEnd: '14:00',
        },
      });
    }
    // Sophie: Caisse 3, mardi et jeudi (supervision)
    for (const day of [2, 4]) {
      await prisma.schedule.create({
        data: {
          employeeId: sophie.id,
          registerId: caisse4.id,
          dayOfWeek: day,
          startTime: '10:00',
          endTime: '16:00',
          notes: 'Supervision',
        },
      });
    }
  }

  console.log(`✅ Plannings créés (Jean-Paul Caisse 1, Fatou Caisse 2, Sophie Caisse 4)`);

  // ========================================
  // TRANSACTIONS (ventes du jour)
  // ========================================
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const allProducts = await prisma.product.findMany();
  const sampleTransactions = [
    { items: [{ idx: 1, qty: 2 }, { idx: 4, qty: 5 }], method: 'cash', cashier: jeanPaul.id },
    { items: [{ idx: 5, qty: 3 }, { idx: 0, qty: 1 }], method: 'mobile', cashier: fatou.id },
    { items: [{ idx: 2, qty: 4 }, { idx: 3, qty: 1 }], method: 'cash', cashier: jeanPaul.id },
    { items: [{ idx: 1, qty: 10 }, { idx: 4, qty: 2 }], method: 'card', cashier: fatou.id },
    { items: [{ idx: 6, qty: 2 }], method: 'cash', cashier: jeanPaul.id },
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

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Comptes de test:');
  console.log('   Manager: EMP001 / PIN: 1234');
  console.log('   Caissier: EMP002 / PIN: 2345');
  console.log('   Caissière: EMP003 / PIN: 3456');
  console.log('   Magasinier: EMP004 / PIN: 4567');
  console.log('   Superviseur: EMP005 / PIN: 5678');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
