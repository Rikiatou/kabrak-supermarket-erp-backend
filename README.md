# 🚀 KABRAK BACKEND - API ERP Supermarché

Backend NestJS **offline-first** pour Kabrak Supermarket ERP.
Optimisé pour **40 000+ produits**, multi-caisses, et fonctionnement **sans internet**.

---

## 📋 PRÉREQUIS

- Node.js 20+
- PostgreSQL 16+ (local ou Docker)
- npm 10+

---

## 🚀 INSTALLATION

### 1. Installer les dépendances
```bash
npm install
```

### 2. Configurer l'environnement
```bash
# Copier le template
cp .env.example .env.local

# Éditer .env.local avec tes infos PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/kabrak_local"
```

### 3. Créer la base de données
```bash
# Créer la DB dans PostgreSQL
createdb kabrak_local

# Générer le client Prisma
npm run prisma:generate

# Appliquer le schéma
npm run prisma:db-push

# (Optionnel) Seed avec données de test
npm run prisma:seed
```

### 4. Démarrer le serveur
```bash
# Développement
npm run start:dev

# Production
npm run build
npm run start:prod
```

API disponible sur: **http://localhost:3000/api**

---

## 📚 API ENDPOINTS

### Health
```
GET /api/health              # Statut serveur
```

### Products (40K+ produits)
```
GET    /api/products              # Liste paginée (?page=1&limit=100)
GET    /api/products/search       # Recherche (?q=riz&category=Épicerie)
GET    /api/products/barcode/:code # Scan caisse (ultra-rapide)
GET    /api/products/stats        # Statistiques
GET    /api/products/alerts       # Alertes stock
GET    /api/products/:id          # Détail produit
POST   /api/products              # Créer
PATCH  /api/products/:id          # Modifier
DELETE /api/products/:id          # Supprimer (soft)
```

### Transactions (Ventes - Offline-first)
```
POST   /api/transactions          # Créer vente
GET    /api/transactions          # Historique (?page=1&limit=50)
GET    /api/transactions/:id      # Détail + reçu
GET    /api/transactions/stats/today    # Stats du jour
GET    /api/transactions/stats/by-register # Ventes par caisse
GET    /api/transactions/pending-sync    # À synchroniser
POST   /api/transactions/:id/refund      # Rembourser
POST   /api/transactions/:id/synced      # Marquer synchronisé
```

### Stock
```
POST   /api/stock/movements       # Mouvement de stock
GET    /api/stock/movements       # Historique mouvements
GET    /api/stock/alerts          # Alertes (rupture, expiration)
GET    /api/stock/value           # Valeur du stock
POST   /api/stock/adjust/:productId # Ajustement inventaire
```

### Import CSV (40K produits)
```
POST   /api/import/products       # Import CSV (body)
POST   /api/import/products/file  # Import CSV (fichier)
GET    /api/import/products/template # Template CSV
```

### Sync (Offline → Cloud)
```
GET    /api/sync/status           # Statut sync
POST   /api/sync/force            # Forcer sync manuel
```

---

## 🔄 FONCTIONNEMENT OFFLINE-FIRST

```
1. Vente en caisse
   → Enregistrée LOCALEMENT (PostgreSQL local)
   → syncStatus = "pending"

2. Si internet OK
   → Sync automatique vers cloud (Hetzner)
   → syncStatus = "synced"

3. Si internet KO
   → Vente continue à fonctionner
   → syncStatus reste "pending"
   → Queue de sync

4. Internet revient
   → Sync automatique (toutes les 5 min)
   → Toutes les transactions "pending" sont envoyées
```

---

## 📊 IMPORT CSV - 40 000 PRODUITS

### Format CSV requis:
```csv
sku,barcode,name,category,price,stock
HV-5L-001,0620012345678,Huile Végétale 5L,Épicerie,5500,50
EM-1.5-003,0610098765432,Eau Minérale 1.5L,Boissons,400,200
```

### Colonnes:
| Colonne | Obligatoire | Description |
|---------|-------------|-------------|
| sku | ✅ | Référence unique |
| barcode | ✅ | Code-barres |
| name | ✅ | Nom du produit |
| category | ✅ | Catégorie |
| price | ✅ | Prix en FCFA |
| stock | ✅ | Stock actuel |
| costPrice | ❌ | Prix d'achat |
| minStock | ❌ | Stock minimum (défaut: 10) |
| unit | ❌ | Unité (défaut: pièce) |
| expiryDate | ❌ | Date expiration (YYYY-MM-DD) |
| brand | ❌ | Marque |
| imageUrl | ❌ | URL image |

### Import via API:
```bash
# Via texte CSV
curl -X POST http://localhost:3000/api/import/products \
  -H "Content-Type: application/json" \
  -d '{"csv": "sku,barcode,name,..."}'

# Via fichier
curl -X POST http://localhost:3000/api/import/products/file \
  -F "file=@products.csv"
```

---

## 🗄️ BASE DE DONNÉES

### Schéma complet
Voir `prisma/schema.prisma` - optimisé pour 40K+ produits avec:
- Index sur barcode, SKU, name, category
- Index sur expiryDate (alertes)
- Index sur stock/minStock (alertes)
- Soft delete (isActive)
- Sync status (offline-first)

### Prisma Studio (GUI)
```bash
npm run prisma:studio
# → http://localhost:5555
```

---

## 🚀 DÉPLOIEMENT

### Serveur local (mini-PC magasin)
```bash
# 1. Installer Node.js 20 + PostgreSQL 16
# 2. Cloner projet
git clone <repo>
cd kabrak-backend

# 3. Install + build
npm install
npm run build

# 4. Configurer .env.local (DB locale)
# 5. Setup DB
npm run prisma:generate
npm run prisma:db-push
npm run prisma:seed

# 6. Démarrer avec PM2 (auto-restart)
npm install -g pm2
pm2 start dist/main.js --name kabrak-backend
pm2 save
pm2 startup
```

### Cloud (Hetzner + Coolify)
```bash
# Via Coolify: 1-click deploy
# Ou via Docker (Dockerfile à venir)
```

---

## 🧪 TESTS

```bash
# Tests unitaires
npm test

# Tests avec coverage
npm run test:cov

# Tests e2e
npm run test:e2e
```

---

## 📁 STRUCTURE

```
kabrak-backend/
├── src/
│   ├── main.ts                 # Point d'entrée
│   ├── app.module.ts           # Module racine
│   ├── app.controller.ts       # Controller racine
│   ├── app.service.ts          # Service racine
│   ├── database/               # Prisma service
│   ├── products/               # Module Produits
│   ├── transactions/           # Module Ventes (offline)
│   ├── stock/                  # Module Stock
│   ├── sync/                   # Module Sync (offline→cloud)
│   └── import/                 # Module Import CSV
├── prisma/
│   ├── schema.prisma           # Schéma DB
│   └── seed.ts                 # Seed data
├── .env.example                # Template config
├── .env.local                  # Config locale
└── package.json
```

---

## 🔐 SÉCURITÉ

- ✅ Validation des entrées (class-validator)
- ✅ CORS configurable
- ✅ Variables d'environnement (.env)
- ✅ Soft delete (pas de suppression physique)
- ⏳ Authentification JWT (à ajouter)
- ⏳ Rate limiting (à ajouter)

---

## 🎯 ROADMAP

- [x] Module Products (CRUD + recherche)
- [x] Module Transactions (offline-first)
- [x] Module Stock (mouvements + alertes)
- [x] Module Import CSV (40K produits)
- [x] Module Sync (offline → cloud)
- [ ] Authentification (JWT + PIN caisse)
- [ ] Module Fournisseurs (CRUD complet)
- [ ] Module Employés (CRUD complet)
- [ ] Module Caisses (ouvertures/fermetures)
- [ ] Module Clients & Fidélité
- [ ] Module Rapports
- [ ] Impression tickets (ESC/POS)
- [ ] Docker + docker-compose

---

**Built with ❤️ for Kabrak Supermarket**
