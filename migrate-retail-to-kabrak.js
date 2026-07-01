/**
 * Migration Retail Plus 50 → KABRAK Easy Shop
 * ============================================
 * - Lit les DBF de "C:\Retail Plus 50"
 * - Upsert produits + clients dans LOCAL + NEON
 * - Re-exécutable : met à jour si déjà existant
 *
 * Usage:
 *   node migrate-retail-to-kabrak.js
 *   node migrate-retail-to-kabrak.js --local-only
 *   node migrate-retail-to-kabrak.js --cloud-only
 */

const { execSync } = require("child_process");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");

// ── Lire un DBF via Python (fichier temporaire pour éviter les problèmes d'échappement) ──
function readDbf(filePath, maxRows = 999999) {
  const tmpScript = path.join(os.tmpdir(), `read_dbf_${Date.now()}.py`);
  const scriptContent = `import json, sys
from dbfread import DBF
try:
    db = DBF(${JSON.stringify(filePath)}, encoding="latin-1", load=False)
    rows = []
    for i, r in enumerate(db):
        if i >= ${maxRows}: break
        row = {}
        for k, v in r.items():
            if v is None:
                row[k] = None
            elif isinstance(v, bytes):
                row[k] = None
            elif hasattr(v, 'isoformat'):
                row[k] = v.isoformat()
            elif isinstance(v, (str, int, float, bool)):
                row[k] = v
            else:
                row[k] = str(v)
        rows.append(row)
    print(json.dumps(rows, ensure_ascii=False))
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;
  fs.writeFileSync(tmpScript, scriptContent);

  try {
    const result = execSync(`python "${tmpScript}"`, {
      maxBuffer: 500 * 1024 * 1024,
      timeout: 300000,
    });
    return JSON.parse(result.toString());
  } finally {
    try { fs.unlinkSync(tmpScript); } catch {}
  }
}

// ── Nettoyage nom produit ──
function cleanName(s) {
  if (!s) return "";
  return s.trim().replace(/^[`,.'"\s-]+/, "").trim();
}

// ── Générer SKU unique ──
let skuCounter = 1;
function makeSku(plu) {
  const clean = String(plu || "").trim();
  if (clean && clean.length >= 4) return clean.substring(0, 30);
  return `EASYS-${String(skuCounter++).padStart(5, "0")}`;
}

// ── Générer barcode unique ──
const usedBarcodes = new Set();
function makeBarcode(plu) {
  const clean = String(plu || "").trim();
  if (clean && !usedBarcodes.has(clean)) {
    usedBarcodes.add(clean);
    return clean;
  }
  // Dupliquer ou vide → générer unique
  const unique = `EASYS-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  usedBarcodes.add(unique);
  return unique;
}

// ── Nettoyer téléphone ──
function cleanPhone(phone) {
  if (!phone) return null;
  const clean = String(phone).replace(/[\s\-\+\(\)]/g, "");
  if (!clean || clean.length < 6) return null;
  if (["000000", "12456", "0", "123", "111111"].includes(clean)) return null;
  return clean;
}

async function migrate(prisma, dbLabel) {
  const LICENSE_KEY = "KABRAK-STD-2024-EASYSHOP-DEMO01";

  console.log(`\n${"=".repeat(55)}`);
  console.log(`  MIGRATION → ${dbLabel}`);
  console.log("=".repeat(55));

  // ── Lire les DBF ──
  console.log("\n[1/4] Lecture des fichiers Retail Plus 50...");
  const products = readDbf("C:/Retail Plus 50/POS/POSINV.DBF");
  const clients  = readDbf("C:/Retail Plus 50/CLIENTS.DBF");
  console.log(`  Produits lus:  ${products.length}`);
  console.log(`  Clients lus:   ${clients.length}`);

  // ── Préparer produits ──
  console.log("\n[2/4] Préparation des produits...");
  skuCounter = 1;
  usedBarcodes.clear();

  const productRows = [];
  const skusSeen = new Set();

  for (const r of products) {
    const nom = cleanName(r.PROD);
    if (!nom) continue;

    const barcode = makeBarcode(r.PLU);
    let sku = makeSku(r.PLU);
    // Garantir sku unique dans ce batch
    if (skusSeen.has(sku)) {
      sku = `EASYS-${String(skuCounter++).padStart(5, "0")}`;
    }
    skusSeen.add(sku);

    const price     = Math.round(parseFloat(r.UNITPRICE1 || 0));
    const costPrice = Math.round(parseFloat(r.LASTCOST || r.AVGCOST || 0));
    const stock     = Math.round(parseFloat(r.ONHAND || 0));
    const category  = String(r.DEPT || "GENERAL ITEMS").trim() || "GENERAL ITEMS";
    const brand     = String(r.BRAND || "").trim() || null;
    const minStock  = 5;

    productRows.push({
      sku,
      barcode,
      name: nom.substring(0, 255),
      category: category.substring(0, 100),
      brand: brand ? brand.substring(0, 100) : null,
      price,
      costPrice,
      stock,
      minStock,
      unit: "pièce",
      taxRate: 0,
      licenseKey: LICENSE_KEY,
    });
  }

  console.log(`  Produits à upsert: ${productRows.length}`);

  // ── Upsert produits par batch de 500 ──
  console.log("\n[3/4] Import produits (upsert par batch de 500)...");
  const BATCH = 500;
  let inserted = 0;
  let updated = 0;
  let errors = 0;
  let firstError = "";

  for (let i = 0; i < productRows.length; i += BATCH) {
    const batch = productRows.slice(i, i + BATCH);
    for (const row of batch) {
      try {
        await prisma.product.upsert({
          where: { barcode: row.barcode },
          create: row,
          update: {
            name:      row.name,
            category:  row.category,
            brand:     row.brand,
            price:     row.price,
            costPrice: row.costPrice,
            stock:     row.stock,
            minStock:  row.minStock,
          },
        });
        inserted++;
      } catch (e) {
        // Try with random SKU
        try {
          const newSku = `EASYS-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
          await prisma.product.upsert({
            where: { barcode: row.barcode },
            create: { ...row, sku: newSku },
            update: {
              name:      row.name,
              category:  row.category,
              brand:     row.brand,
              price:     row.price,
              costPrice: row.costPrice,
              stock:     row.stock,
            },
          });
          inserted++;
        } catch (e2) {
          errors++;
          if (!firstError) firstError = e2.message;
        }
      }
    }
    process.stdout.write(`\r  Traités: ${Math.min(i + BATCH, productRows.length)} / ${productRows.length}`);
  }
  console.log(`\n  ✓ ${inserted} produits importés/mis à jour`);
  if (errors > 0) {
    console.log(`  ⚠ ${errors} erreurs. Première erreur: ${firstError}`);
  }

  // ── Upsert clients ──
  console.log("\n[4/4] Import clients...");
  const phonesUsed = new Set();
  let clientsOk = 0;
  let clientsSkipped = 0;
  let custCounter = 1;

  for (const r of clients) {
    const firstName = String(r.FNAME || r.COMPANY || "").trim();
    const lastName  = String(r.LNAME || "").trim();
    if (!firstName && !lastName) { clientsSkipped++; continue; }

    const phone = cleanPhone(r.WORKPHONE || r.HOMEPHONE);
    if (!phone) { clientsSkipped++; continue; }
    if (phonesUsed.has(phone)) { clientsSkipped++; continue; }
    phonesUsed.add(phone);

    const custNo = String(r.CUSTNO || "").trim() ||
                   `ES-${String(custCounter).padStart(4, "0")}`;
    custCounter++;

    const email = String(r.EMAIL || "").trim() || null;

    try {
      await prisma.customer.upsert({
        where: { phone },
        create: {
          customerNumber: custNo,
          firstName:  firstName.substring(0, 100),
          lastName:   lastName.substring(0, 100),
          phone,
          email:      email ? email.substring(0, 200) : null,
          points:     Math.round(parseFloat(r.POINTS || 0)),
          licenseKey: LICENSE_KEY,
        },
        update: {
          firstName:  firstName.substring(0, 100),
          lastName:   lastName.substring(0, 100),
          email:      email ? email.substring(0, 200) : null,
        },
      });
      clientsOk++;
    } catch (e) {
      // customerNumber conflict → retry with unique
      try {
        const newCustNo = `ES-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
        await prisma.customer.upsert({
          where: { phone },
          create: {
            customerNumber: newCustNo,
            firstName:  firstName.substring(0, 100),
            lastName:   lastName.substring(0, 100),
            phone,
            email:      email ? email.substring(0, 200) : null,
            licenseKey: LICENSE_KEY,
          },
          update: {
            firstName: firstName.substring(0, 100),
            lastName:  lastName.substring(0, 100),
          },
        });
        clientsOk++;
      } catch (e2) {
        clientsSkipped++;
      }
    }
  }

  console.log(`  ✓ ${clientsOk} clients importés | ${clientsSkipped} ignorés`);

  // ── Vérification finale ──
  const totalProd = await prisma.product.count({ where: { licenseKey: LICENSE_KEY } });
  const totalCust = await prisma.customer.count({ where: { licenseKey: LICENSE_KEY } });
  console.log(`\n  ═══ ${dbLabel} — RÉSULTAT FINAL ═══`);
  console.log(`  Produits dans KABRAK Easy Shop: ${totalProd}`);
  console.log(`  Clients dans KABRAK Easy Shop:  ${totalCust}`);
}

// ── MAIN ──
async function main() {
  const { PrismaClient } = require("@prisma/client");
  const args = process.argv.slice(2);
  const localOnly = args.includes("--local-only");
  const cloudOnly = args.includes("--cloud-only");

  // LOCAL
  if (!cloudOnly) {
    const localPrisma = new PrismaClient({
      datasources: { db: { url: "postgresql://postgres:postgres@localhost:5432/kabrak_local" } },
    });
    try {
      await migrate(localPrisma, "BASE LOCALE (PC Serveur)");
    } finally {
      await localPrisma.$disconnect();
    }
  }

  // CLOUD (Neon)
  if (!localOnly) {
    const neonPrisma = new PrismaClient({
      datasources: {
        db: {
          url: "postgresql://neondb_owner:npg_D0opaGT2lVtE@ep-damp-dust-asr1jhwl-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require",
        },
      },
    });
    try {
      await migrate(neonPrisma, "BASE CLOUD (Neon)");
    } finally {
      await neonPrisma.$disconnect();
    }
  }

  console.log("\n✅  Migration terminée !");
  console.log("   Ce soir : copie Retail Plus à jour → relancer le script");
  console.log("   Les données existantes seront mises à jour (upsert).");
}

main().catch((e) => {
  console.error("ERREUR:", e.message);
  process.exit(1);
});
