const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mapping: old category → normalized category
// Consolidate typos, duplicates, and truncated names
const CATEGORY_MAP = {
  // Beverages
  'BREAVERAGES': 'BEVERAGES',
  'BEAVERAGES': 'BEVERAGES',
  'BEVERAGES': 'BEVERAGES',
  'BEVERAGE': 'BEVERAGES',
  'BEER': 'BEVERAGES',
  'BEERS': 'BEVERAGES',
  'WATER': 'BEVERAGES',
  'WINE & WHISKY': 'WINE & SPIRITS',
  'WINE &WHISKY': 'WINE & SPIRITS',
  'WINE': 'WINE & SPIRITS',
  'VODKA': 'WINE & SPIRITS',
  'NON-ALC WINE': 'WINE & SPIRITS',
  'NON-ALC WINE &': 'WINE & SPIRITS',
  'NON-ALC WINE&': 'WINE & SPIRITS',
  'PRIOR GOUT FUME': 'WINE & SPIRITS',

  // Food stuff
  'FOOD STUFF': 'FOOD STUFF',
  'FOODSTUFF': 'FOOD STUFF',
  'BREAK FAST-ITEM': 'BREAKFAST ITEMS',
  'BREAK FAST ITEM': 'BREAKFAST ITEMS',
  'BREAKFAST ITEMS': 'BREAKFAST ITEMS',
  'BREAKFAST ITEM': 'BREAKFAST ITEMS',
  'ICE CREAM': 'FROZEN FOODS',
  'FREEZER ITEMS': 'FROZEN FOODS',
  'FREEZERS': 'FROZEN FOODS',
  'DEEP FREEZER': 'FROZEN FOODS',

  // Cosmetics / Toiletries
  'COSMATICS': 'COSMETICS',
  'COSMATIC': 'COSMETICS',
  'COSMETICS': 'COSMETICS',
  'TOILETRIES': 'TOILETRIES',
  'DENTAL PRODUCTS': 'TOILETRIES',
  'DENTAL': 'TOILETRIES',
  'SHAVING': 'TOILETRIES',
  'SHOE-POLISH': 'TOILETRIES',
  'SHOE POLISH': 'TOILETRIES',

  // Cleaning
  'CLEANING ITEMS': 'CLEANING ITEMS',

  // Kitchen
  'KITCHEN WARE': 'KITCHEN & DINING',
  'KITCHEN WEAR': 'KITCHEN & DINING',
  'KITCHEN APPLIAN': 'KITCHEN & DINING',
  'KICHEN APPLIANC': 'KITCHEN & DINING',
  'CROKERY ITEMS': 'KITCHEN & DINING',
  'GLASS WARE': 'KITCHEN & DINING',
  'CUTLERY': 'KITCHEN & DINING',
  'FLASK/CATTLE/PO': 'KITCHEN & DINING',
  'FLASK/CATTLES': 'KITCHEN & DINING',
  'FLASK/CATTLES/P': 'KITCHEN & DINING',
  'LUNCH BOX/CONTA': 'KITCHEN & DINING',

  // Appliances
  'HOME APPLIANCE': 'APPLIANCES',
  'ELECTRONICS': 'APPLIANCES',
  'ELECTRONIC ITEM': 'APPLIANCES',
  'REFRIGERATOR': 'APPLIANCES',
  'REFRIREGATORS': 'APPLIANCES',
  'WASHING MACHINE': 'APPLIANCES',
  'GAS COOKERS': 'APPLIANCES',
  'GAS-COOKERS': 'APPLIANCES',
  'IRONS-ELECTRIC': 'APPLIANCES',
  'IRON-ELECTRIC': 'APPLIANCES',
  'WATER DISPENSER': 'APPLIANCES',
  'FANS': 'APPLIANCES',
  'AC': 'APPLIANCES',

  // Baby
  'BABY STUFF': 'BABY PRODUCTS',

  // Pets
  'DOG &CAT FOOD': 'PET FOOD',
  'DOG & CAT FOOD': 'PET FOOD',

  // Confectionary
  'CONFECTIONARY': 'CONFECTIONERY',

  // Tobacco
  'CIGARETTE&TABBA': 'CIGARETTES & TOBACCO',
  'CIGRATE & TABBA': 'CIGARETTES & TOBACCO',
  'CIGAR\\TABBA': 'CIGARETTES & TOBACCO',

  // Toys & Gifts
  'TOYS&GIFTS ITEM': 'TOYS & GIFTS',
  'TOYS & GIFT ITE': 'TOYS & GIFTS',
  'TOYS': 'TOYS & GIFTS',

  // Camera
  'CAMERA & ACCESS': 'CAMERA & ACCESSORIES',
  'CAMERA&ACCESSOR': 'CAMERA & ACCESSORIES',
  'ACCESSORIES': 'CAMERA & ACCESSORIES',

  // General / Misc
  'GENERAL ITEMS': 'GENERAL ITEMS',
  'GENERAL ITEM': 'GENERAL ITEMS',
  'Grocery': 'GENERAL ITEMS',
  'LADIES STUFF': 'GENERAL ITEMS',
  'CLOTHING': 'GENERAL ITEMS',
  'CAMPING': 'GENERAL ITEMS',
  'ALPINE GEAR': 'GENERAL ITEMS',
  'LUGGAGE': 'GENERAL ITEMS',
  'OFFICE ITEMS': 'STATIONERY',
  'STATIONERY': 'STATIONERY',
  'CAR PRODUCTS': 'AUTOMOTIVE',
  'FURNITURE': 'FURNITURE',

  // Junk / data errors → GENERAL ITEMS
  '5900627057553': 'GENERAL ITEMS',
  '6105401226210': 'GENERAL ITEMS',
  'ENVIRO FEE': 'GENERAL ITEMS',
};

async function main() {
  console.log('=== NORMALIZING CATEGORIES ===\n');

  // Get all current categories
  const cats = await prisma.product.groupBy({
    by: ['category'],
    _count: true,
  });

  let totalUpdated = 0;
  const changes = [];

  for (const cat of cats) {
    const oldName = cat.category;
    const newName = CATEGORY_MAP[oldName];
    if (newName && newName !== oldName) {
      const result = await prisma.product.updateMany({
        where: { category: oldName },
        data: { category: newName },
      });
      console.log(`  "${oldName}" → "${newName}" | ${result.count} products updated`);
      changes.push({ oldName, newName, count: result.count });
      totalUpdated += result.count;
    } else if (!newName) {
      console.log(`  ⚠️  "${oldName}" — no mapping (keeping as-is)`);
    }
  }

  console.log(`\n=== DONE: ${totalUpdated} products updated across ${changes.length} categories ===\n`);

  // Show final categories
  const finalCats = await prisma.product.groupBy({
    by: ['category'],
    _count: true,
    orderBy: { _count: { category: 'desc' } },
  });
  console.log(`Final categories: ${finalCats.length}`);
  finalCats.forEach(c => console.log(`  "${c.category}" | ${c._count.category}`));
}

main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
