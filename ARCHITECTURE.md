# 🏗️ KABRAK BACKEND - ARCHITECTURE OFFLINE-FIRST

**Pour:** Très grand supermarché (40K+ produits, multi-caisses)  
**Stack:** NestJS + PostgreSQL + Offline-first  
**Déploiement:** Serveur local magasin (mini-PC) + Hetzner (cloud)

---

## 🎯 ARCHITECTURE GLOBALE

```
┌─────────────────────────────────────────────────────┐
│  MAGASIN (Serveur local - mini-PC)                  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ PostgreSQL Local (Primary)                   │  │
│  │  • 40 000+ produits                          │  │
│  │  • Transactions locales                      │  │
│  │  • Stock temps réel                          │  │
│  │  • Index optimisés (barcode, SKU, name)      │  │
│  └──────────────────────────────────────────────┘  │
│                      ↕                              │
│  ┌──────────────────────────────────────────────┐  │
│  │ NestJS Backend Local (ce projet)             │  │
│  │  • API REST ultra-rapide                     │  │
│  │  • Recherche produits (<50ms)                │  │
│  │  • Ventes offline                            │  │
│  │  • Import CSV (40K produits)                 │  │
│  │  • Sync agent (vers cloud)                   │  │
│  └──────────────────────────────────────────────┘  │
│                      ↕                              │
│  ┌──────────────────────────────────────────────┐  │
│  │ Caisses (LAN - Wi-Fi/Ethernet)               │  │
│  │  • Next.js POS (frontend existant)           │  │
│  │  • Connecté au backend local                 │  │
│  │  • Fonctionne SANS internet                  │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        ↕
            (sync quand internet OK)
                        ↕
┌─────────────────────────────────────────────────────┐
│  CLOUD (Hetzner)                                    │
│  • PostgreSQL central (réplication)                 │
│  • Dashboard dirigeant                              │
│  • Rapports multi-magasins                          │
│  • Backups automatiques                             │
│  • WhatsApp bot / IA                                │
└─────────────────────────────────────────────────────┘
```

---

## 📁 STRUCTURE DU PROJET

```
kabrak-backend/
├── src/
│   ├── main.ts                    # Point d'entrée
│   ├── app.module.ts              # Module racine
│   │
│   ├── products/                  # Module Produits
│   │   ├── products.module.ts
│   │   ├── products.controller.ts # API /products
│   │   ├── products.service.ts    # Logique métier
│   │   ├── products.entity.ts     # Entité TypeORM
│   │   └── dto/
│   │       ├── create-product.dto.ts
│   │       ├── update-product.dto.ts
│   │       └── search-product.dto.ts
│   │
│   ├── transactions/              # Module Ventes
│   │   ├── transactions.module.ts
│   │   ├── transactions.controller.ts
│   │   ├── transactions.service.ts
│   │   ├── transactions.entity.ts
│   │   └── dto/
│   │
│   ├── stock/                     # Module Stock
│   │   ├── stock.module.ts
│   │   ├── stock.controller.ts
│   │   ├── stock.service.ts
│   │   └── stock-movement.entity.ts
│   │
│   ├── sync/                      # Module Synchronisation
│   │   ├── sync.module.ts
│   │   ├── sync.service.ts        # Sync local → cloud
│   │   └── sync.queue.ts          # Queue offline
│   │
│   ├── import/                    # Module Import CSV
│   │   ├── import.module.ts
│   │   ├── import.controller.ts
│   │   ├── import.service.ts      # Import 40K produits
│   │   └── csv-parser.ts
│   │
│   ├── database/                  # Configuration DB
│   │   ├── database.module.ts
│   │   └── migrations/
│   │
│   └── common/                    # Utilitaires
│       ├── decorators/
│       ├── filters/
│       ├── guards/
│       └── interceptors/
│
├── prisma/                        # Prisma ORM
│   ├── schema.prisma              # Schéma DB optimisé
│   └── seed.ts                    # Seed data
│
├── config/                        # Configuration
│   ├── database.config.ts
│   ├── sync.config.ts
│   └── app.config.ts
│
├── test/                          # Tests
│   ├── products.e2e-spec.ts
│   └── transactions.e2e-spec.ts
│
├── .env.local                     # Config locale
├── .env.production                # Config production
├── package.json
├── tsconfig.json
├── nest-cli.json
└── README.md
```

---

## 🚀 MODULES PRINCIPAUX

### 1. **Products Module** (Priorité 1)
```typescript
Endpoints:
GET    /api/products              # Liste (pagination, 40K produits)
GET    /api/products/search       # Recherche ultra-rapide (<50ms)
GET    /api/products/:id          # Détail
POST   /api/products              # Créer
PUT    /api/products/:id          # Modifier
DELETE /api/products/:id          # Supprimer
POST   /api/products/import       # Import CSV (40K produits)
GET    /api/products/barcode/:code # Scan caisse

Optimisations:
✅ Index sur barcode, SKU, name (trigram)
✅ Pagination (100 produits/page)
✅ Cache Redis (produits populaires)
✅ Recherche full-text PostgreSQL
```

### 2. **Transactions Module** (Priorité 1)
```typescript
Endpoints:
POST   /api/transactions          # Créer vente (offline OK)
GET    /api/transactions          # Historique
GET    /api/transactions/:id      # Détail + reçu
PUT    /api/transactions/:id/sync # Marquer comme synchronisé

Offline-first:
✅ Enregistrement local immédiat
✅ Queue de sync (quand internet revient)
✅ Gestion conflits (timestamp)
✅ Mise à jour stock automatique
```

### 3. **Stock Module** (Priorité 2)
```typescript
Endpoints:
GET    /api/stock/alerts          # Alertes (rupture, faible, expiration)
POST   /api/stock/movements       # Mouvement (entrée/sortie)
GET    /api/stock/inventory       # Inventaire complet
POST   /api/stock/adjust          # Ajustement manuel

Fonctionnalités:
✅ Alertes temps réel
✅ Historique mouvements
✅ Calcul stock théorique vs réel
```

### 4. **Sync Module** (Priorité 2)
```typescript
Fonctionnalités:
✅ Détection connexion internet
✅ Queue de synchronisation
✅ Retry automatique (exponential backoff)
✅ Gestion conflits (last-write-wins)
✅ Logs de sync

Stratégie:
- Transactions → sync immédiat (si internet OK)
- Produits/Stock → sync toutes les 5 min
- Rapports → sync toutes les heures
```

### 5. **Import Module** (Priorité 1)
```typescript
Endpoints:
POST   /api/import/products       # Upload CSV
GET    /api/import/status/:id     # Statut import
GET    /api/import/template       # Template CSV

Fonctionnalités:
✅ Import CSV 40K+ produits
✅ Validation données
✅ Import par batch (1000/batch)
✅ Progress bar temps réel
✅ Rollback si erreur
```

---

## 🗄️ SCHÉMA BASE DE DONNÉES

```prisma
// Optimisé pour 40K+ produits

model Product {
  id          String   @id @default(cuid())
  sku         String   @unique
  barcode     String   @unique
  name        String
  category    String
  price       Int      // Prix en centimes FCFA
  costPrice   Int
  stock       Int
  minStock    Int
  unit        String
  expiryDate  DateTime?
  supplierId  String?
  supplier    Supplier? @relation(fields: [supplierId], references: [id])
  imageUrl    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  transactionItems TransactionItem[]
  stockMovements   StockMovement[]
  
  // Index CRITIQUES pour performance
  @@index([barcode])           // Scan caisse
  @@index([sku])               // Recherche
  @@index([category])          // Filtres
  @@index([name])              // Recherche texte
  @@index([expiryDate])        // Alertes expiration
  @@index([stock, minStock])   // Alertes stock
}

model Transaction {
  id            String   @id @default(cuid())
  date          DateTime @default(now())
  cashierId     String
  registerId    String?
  subtotal      Int
  discount      Int
  tax           Int
  total         Int
  paymentMethod String
  status        String   // "completed", "pending_sync", "synced"
  syncedAt      DateTime?
  items         TransactionItem[]
  
  @@index([date])
  @@index([status])
  @@index([cashierId])
}

model StockMovement {
  id          String   @id @default(cuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id])
  type        String   // "in", "out", "adjustment", "loss"
  quantity    Int
  reason      String?
  reference   String?
  createdAt   DateTime @default(now())
  syncStatus  String   @default("pending") // "pending", "synced"
  
  @@index([productId])
  @@index([createdAt])
  @@index([syncStatus])
}
```

---

## ⚡ OPTIMISATIONS PERFORMANCE (40K+ produits)

### 1. **Index PostgreSQL**
```sql
-- Recherche code-barres (scan caisse) <10ms
CREATE INDEX idx_products_barcode ON products(barcode);

-- Recherche texte (trigram pour typos)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops);

-- Alertes stock
CREATE INDEX idx_products_stock_alert ON products(stock, min_stock) WHERE stock <= min_stock;

-- Expiration
CREATE INDEX idx_products_expiry ON products(expiry_date) WHERE expiry_date IS NOT NULL;
```

### 2. **Pagination**
```typescript
// Jamais charger 40K produits d'un coup
GET /api/products?page=1&limit=100
```

### 3. **Cache Redis** (optionnel)
```typescript
// Produits les plus scannés en cache
@CacheKey('product:barcode')
@CacheTTL(3600) // 1h
async findByBarcode(barcode: string) { ... }
```

### 4. **Recherche Full-Text**
```sql
-- Recherche rapide multi-critères
SELECT * FROM products
WHERE 
  name ILIKE '%riz%' 
  OR sku ILIKE '%riz%'
  OR barcode LIKE '%riz%'
LIMIT 50;
```

---

## 🔄 STRATÉGIE OFFLINE-FIRST

### Principe:
```
1. Toute action = enregistrée LOCALEMENT d'abord
2. Si internet OK → sync immédiat
3. Si internet KO → queue de sync
4. Quand internet revient → sync automatique
```

### Implémentation:
```typescript
// Service de sync
@Injectable()
export class SyncService {
  private syncQueue: Transaction[] = [];
  private isOnline = true;

  async createTransaction(data: CreateTransactionDto) {
    // 1. Enregistrer LOCAL (toujours)
    const transaction = await this.db.transaction.create({
      data: { ...data, status: 'pending_sync' }
    });

    // 2. Essayer sync immédiat
    if (this.isOnline) {
      await this.syncToCloud(transaction);
    } else {
      this.syncQueue.push(transaction);
    }

    return transaction;
  }

  @Cron('*/5 * * * *') // Toutes les 5 min
  async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.length === 0) return;

    for (const tx of this.syncQueue) {
      try {
        await this.syncToCloud(tx);
        this.syncQueue = this.syncQueue.filter(t => t.id !== tx.id);
      } catch (e) {
        // Réessayer plus tard
      }
    }
  }
}
```

---

## 🚀 DÉMARRAGE RAPIDE

```bash
# 1. Installer dépendances
npm install

# 2. Configurer .env.local
DATABASE_URL="postgresql://user:pass@localhost:5432/kabrak"
CLOUD_API_URL="https://ton-hetzner.com/api"

# 3. Créer DB + migrations
npx prisma migrate dev

# 4. Importer produits CSV
POST /api/import/products (upload CSV 40K produits)

# 5. Démarrer serveur
npm run start:dev

# 6. Tester
GET http://localhost:3000/api/products/search?q=riz
```

---

## 📦 DÉPLOIEMENT

### Serveur local (mini-PC magasin):
```bash
# 1. Installer Node.js 20
# 2. Installer PostgreSQL 16
# 3. Cloner projet
git clone ...
cd kabrak-backend
npm install
npm run build

# 4. Démarrer en production
npm run start:prod

# 5. PM2 (auto-restart)
pm2 start dist/main.js --name kabrak-backend
pm2 save
pm2 startup
```

### Cloud (Hetzner):
```bash
# Via Coolify (1-click deploy)
# Ou Docker
docker-compose up -d
```

---

## 🎯 PROCHAINES ÉTAPES

1. ✅ Créer structure NestJS
2. ⏳ Schéma Prisma complet
3. ⏳ Module Products (+ import CSV)
4. ⏳ Module Transactions (offline-first)
5. ⏳ Module Sync
6. ⏳ Tests avec 40K produits

---

**Prêt à construire le backend le plus performant pour ton supermarché!** 🚀
