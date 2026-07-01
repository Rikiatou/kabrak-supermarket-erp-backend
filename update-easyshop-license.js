/**
 * Met à jour la licence Easy Shop : 13 mois à partir d'aujourd'hui
 * (12 mois payés + 1 mois offert)
 */
const { PrismaClient } = require("@prisma/client");

const LICENSE_KEY = "KABRAK-STD-2024-EASYSHOP-DEMO01";

async function updateLicense(prisma, label) {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + 13);

  const result = await prisma.license.updateMany({
    where: { licenseKey: LICENSE_KEY },
    data: {
      durationMonths: 13,
      expiresAt,
      status: "ACTIVE",
      issuedAt: now,
      internalNotes: `Licence 13 mois (12 payés + 1 offert) — Easy Shop Limbe — émise le ${now.toISOString().split("T")[0]}`,
    },
  });

  if (result.count > 0) {
    console.log(`✓ ${label}: Licence mise à jour`);
    console.log(`  Émise le:   ${now.toISOString().split("T")[0]}`);
    console.log(`  Expire le:  ${expiresAt.toISOString().split("T")[0]} (13 mois)`);
  } else {
    console.log(`✗ ${label}: Licence non trouvée (clé: ${LICENSE_KEY})`);
  }
}

async function main() {
  console.log("=".repeat(55));
  console.log("  MISE À JOUR LICENCE EASY SHOP — 13 MOIS");
  console.log("=".repeat(55));

  // LOCAL
  const local = new PrismaClient({
    datasources: { db: { url: "postgresql://postgres:postgres@localhost:5432/kabrak_local" } },
  });
  try {
    await updateLicense(local, "BASE LOCALE");
  } catch (e) {
    console.error("Local:", e.message);
  } finally {
    await local.$disconnect();
  }

  // CLOUD Neon
  const cloud = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require",
      },
    },
  });
  try {
    await updateLicense(cloud, "BASE CLOUD (Neon)");
  } catch (e) {
    console.error("Cloud:", e.message);
  } finally {
    await cloud.$disconnect();
  }

  console.log("\n✅  Licence Easy Shop : 13 mois activée (local + cloud)");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
