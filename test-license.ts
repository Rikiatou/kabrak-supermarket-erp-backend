import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const license = await prisma.license.create({
      data: {
        licenseKey: 'TEST-DELETE-ME-NOW',
        clientName: 'Test Easy Shop',
        clientEmail: 'test-easy@demo.com',
        clientPhone: '+22507000000',
        type: 'STANDARD',
        maxStores: 1,
        durationMonths: 1,
        expiresAt: new Date(Date.now() + 30 * 86400000),
        status: 'ACTIVE',
        config: {
          create: {
            supermarketName: 'Test Easy Shop',
            primaryColor: '#2563eb',
            currency: 'FCFA',
            taxRate: 15.5,
            receiptFooter: 'Merci de votre visite !',
            receiptShowLogo: true,
            enableLoyalty: true,
            enableAutoPrint: false,
          },
        },
        stores: {
          create: [
            {
              name: 'Test Easy Shop',
              code: 'STORE001',
              isActive: true,
            },
          ],
        },
      },
    });
    console.log('OK! License created:', license.licenseKey);
    // Clean up
    await prisma.license.delete({ where: { id: license.id } });
    console.log('Cleaned up.');
  } catch (e: any) {
    console.error('ERROR:', e.message);
    console.error('FULL:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
