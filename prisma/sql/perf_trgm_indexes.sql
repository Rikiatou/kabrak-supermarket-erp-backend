-- Migration: Index trigram pour recherche texte ultra-rapide
-- À exécuter sur le mini-PC (PostgreSQL local)
-- La recherche par nom avec mode: 'insensitive' fait un full table scan
-- sans cet index. Avec pg_trgm + GIN, la recherche passe de ~500ms à ~5ms.

-- 1. Activer l'extension trigram (nécessaire pour les index GIN sur texte)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Index GIN pour recherche insensible à la casse (ILIKE / contains mode insensitive)
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_sku_trgm ON products USING gin (sku gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_barcode_trgm ON products USING gin (barcode gin_trgm_ops);

-- 3. Index pour packBarcode (scan caisse par pack)
CREATE INDEX IF NOT EXISTS idx_products_packbarcode ON products (packBarcode);
