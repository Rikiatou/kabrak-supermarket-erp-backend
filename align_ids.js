const { PrismaClient } = require('@prisma/client');

// Local DB (mini PC)
const localPrisma = new PrismaClient();

// Cloud DB (Neon)
const cloudPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    },
  },
});

async function main() {
  // 1. Get all local employees
  const localEmps = await localPrisma.employee.findMany({
    select: { id: true, employeeNumber: true, firstName: true, lastName: true, role: true },
  });
  console.log(`Local employees: ${localEmps.length}`);

  // 2. Get all cloud employees
  const cloudEmps = await cloudPrisma.employee.findMany({
    select: { id: true, employeeNumber: true, firstName: true, lastName: true, role: true },
  });
  console.log(`Cloud employees: ${cloudEmps.length}`);

  // 3. For each match by employeeNumber, align cloud ID to local ID
  for (const local of localEmps) {
    const cloud = cloudEmps.find(c => c.employeeNumber === local.employeeNumber);
    if (!cloud) {
      console.log(`SKIP: ${local.firstName} ${local.lastName} (${local.employeeNumber}) — not on cloud`);
      continue;
    }

    if (cloud.id === local.id) {
      console.log(`OK: ${local.firstName} ${local.lastName} — IDs already match (${local.id})`);
      continue;
    }

    console.log(`\nALIGNING: ${local.firstName} ${local.lastName} (${local.employeeNumber})`);
    console.log(`  Cloud ID: ${cloud.id} → ${local.id}`);

    // Update all referencing tables FIRST (to avoid FK constraint errors)
    // Use raw SQL because Prisma can't update IDs with relations easily

    // Transaction.cashierId
    const txUpdated = await cloudPrisma.$executeRawUnsafe(
      `UPDATE transactions SET "cashierId" = $1 WHERE "cashierId" = $2`,
      local.id, cloud.id
    ).catch(e => console.log(`  transactions: ${e.message}`));
    if (typeof txUpdated === 'number') console.log(`  transactions updated: ${txUpdated}`);

    // Shift.employeeId
    const shiftUpdated = await cloudPrisma.$executeRawUnsafe(
      `UPDATE shifts SET "employeeId" = $1 WHERE "employeeId" = $2`,
      local.id, cloud.id
    ).catch(e => console.log(`  shifts: ${e.message}`));
    if (typeof shiftUpdated === 'number') console.log(`  shifts updated: ${shiftUpdated}`);

    // Schedule.employeeId
    const schedUpdated = await cloudPrisma.$executeRawUnsafe(
      `UPDATE schedules SET "employeeId" = $1 WHERE "employeeId" = $2`,
      local.id, cloud.id
    ).catch(e => console.log(`  schedules: ${e.message}`));
    if (typeof schedUpdated === 'number') console.log(`  schedules updated: ${schedUpdated}`);

    // Revenue.cashierId
    const revUpdated = await cloudPrisma.$executeRawUnsafe(
      `UPDATE revenues SET "cashierId" = $1 WHERE "cashierId" = $2`,
      local.id, cloud.id
    ).catch(e => console.log(`  revenues: ${e.message}`));
    if (typeof revUpdated === 'number') console.log(`  revenues updated: ${revUpdated}`);

    // createdBy fields (not FK constraints, but should be aligned too)
    await cloudPrisma.$executeRawUnsafe(
      `UPDATE customers SET "createdBy" = $1 WHERE "createdBy" = $2`,
      local.id, cloud.id
    ).catch(() => {});
    await cloudPrisma.$executeRawUnsafe(
      `UPDATE expenses SET "createdBy" = $1 WHERE "createdBy" = $2`,
      local.id, cloud.id
    ).catch(() => {});
    await cloudPrisma.$executeRawUnsafe(
      `UPDATE invoices SET "createdBy" = $1 WHERE "createdBy" = $2`,
      local.id, cloud.id
    ).catch(() => {});
    await cloudPrisma.$executeRawUnsafe(
      `UPDATE purchase_orders SET "createdBy" = $1 WHERE "createdBy" = $2`,
      local.id, cloud.id
    ).catch(() => {});
    await cloudPrisma.$executeRawUnsafe(
      `UPDATE product_returns SET "createdBy" = $1 WHERE "createdBy" = $2`,
      local.id, cloud.id
    ).catch(() => {});

    // Finally, update the employee ID itself
    // Need to drop the old ID first, then insert with new ID
    // Prisma can't update @id field directly, use raw SQL
    await cloudPrisma.$executeRawUnsafe(
      `UPDATE employees SET id = $1 WHERE id = $2`,
      local.id, cloud.id
    ).then(() => console.log(`  employee ID updated ✓`))
    .catch(e => console.log(`  employee ID update FAILED: ${e.message}`));
  }

  // 4. Verify
  const cloudAfter = await cloudPrisma.employee.findMany({
    select: { id: true, employeeNumber: true, firstName: true, lastName: true },
  });
  console.log(`\n=== CLOUD EMPLOYEES AFTER ALIGNMENT (${cloudAfter.length}) ===`);
  cloudAfter.forEach(e => {
    const local = localEmps.find(l => l.employeeNumber === e.employeeNumber);
    const match = local && local.id === e.id ? '✓' : '✗ MISMATCH';
    console.log(`  ${e.id} | ${e.employeeNumber} | ${e.firstName} ${e.lastName} | ${match}`);
  });

  await localPrisma.$disconnect();
  await cloudPrisma.$disconnect();
  console.log('\nDONE');
}

main().catch(e => { console.error(e); process.exit(1); });
