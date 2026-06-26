import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface ImportResult {
  total: number;
  success: number;
  errors: number;
  errorDetails: Array<{ row: number; error: string; data?: any }>;
  duration: number;
}

@Injectable()
export class ImportService {
  constructor(private prisma: PrismaService) {}

  // Parser CSV simple (sans dépendance externe)
  parseCSV(csvText: string): any[] {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) {
      throw new BadRequestException('CSV vide ou invalide');
    }

    // Détecter séparateur (, ou ;)
    const separator = lines[0].includes(';') ? ';' : ',';

    const headers = lines[0]
      .split(separator)
      .map((h) => h.trim().toLowerCase().replace(/"/g, ''));

    const requiredHeaders = ['name', 'category', 'price', 'stock'];
    const missing = requiredHeaders.filter((h) => !headers.includes(h));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Colonnes manquantes: ${missing.join(', ')}. Requis: ${requiredHeaders.join(', ')}`,
      );
    }

    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseCSVLine(line, separator);
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim().replace(/"/g, '') || '';
      });
      rows.push({ rowIndex: i + 1, data: row });
    }

    return rows;
  }

  // Parser une ligne CSV (gère les guillemets)
  private parseCSVLine(line: string, separator: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  // Importer produits depuis CSV
  async importProducts(csvText: string): Promise<ImportResult> {
    const startTime = Date.now();
    const rows = this.parseCSV(csvText);

    let success = 0;
    let errors = 0;
    const errorDetails: Array<{ row: number; error: string; data?: any }> = [];

    // Import par batch de 1000 pour performance
    const batchSize = 1000;
    const batches: any[][] = [];

    for (let i = 0; i < rows.length; i += batchSize) {
      batches.push(rows.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const productsToCreate: any[] = [];

      for (const { rowIndex, data } of batch) {
        try {
          // Validation
          if (!data.name) {
            throw new BadRequestException('name est obligatoire');
          }

          const price = parseFloat(data.price) || 0;
          const costPrice = parseFloat(data.costprice || data.cost_price || '0') || 0;
          const stock = parseInt(data.stock) || 0;
          const minStock = parseInt(data.minstock || data.min_stock || '10') || 10;

          if (price < 0 || stock < 0) {
            throw new BadRequestException('Prix et stock doivent être positifs');
          }

          // Auto-générer SKU et barcode si manquants
          const sku = data.sku || `PRD-${String(rowIndex).padStart(5, '0')}`;
          const barcode = data.barcode || `2000000000${String(rowIndex).padStart(3, '0')}`;

          productsToCreate.push({
            sku,
            barcode,
            name: data.name,
            description: data.description || null,
            category: data.category || 'Divers',
            subCategory: data.subcategory || data.sub_category || null,
            brand: data.brand || null,
            price,
            costPrice,
            taxRate: parseFloat(data.taxrate || data.tax_rate || '15.5') || 15.5,
            stock,
            minStock,
            unit: data.unit || 'pièce',
            imageUrl: data.imageurl || data.image_url || null,
            expiryDate: data.expirydate || data.expiry_date
              ? new Date(data.expirydate || data.expiry_date)
              : null,
          });
        } catch (e) {
          errors++;
          errorDetails.push({
            row: rowIndex,
            error: e.message,
            data,
          });
        }
      }

      // Insertion batch avec gestion des doublons
      if (productsToCreate.length > 0) {
        try {
          const result = await this.prisma.product.createMany({
            data: productsToCreate,
            skipDuplicates: true,
          });
          success += result.count;
        } catch (e) {
          // Si erreur batch, essayer un par un
          for (const product of productsToCreate) {
            try {
              await this.prisma.product.create({ data: product });
              success++;
            } catch (err) {
              errors++;
              errorDetails.push({
                row: 0,
                error: `Doublon: ${product.sku} - ${err.message}`,
              });
            }
          }
        }
      }
    }

    return {
      total: rows.length,
      success,
      errors,
      errorDetails: errorDetails.slice(0, 100), // Limiter à 100 erreurs
      duration: Date.now() - startTime,
    };
  }

  // Template CSV
  getTemplate(): string {
    return `sku,barcode,name,category,subCategory,brand,price,costPrice,stock,minStock,unit,expiryDate,imageUrl
HV-5L-001,0620012345678,Huile Végétale 5L,Épicerie,Huiles,SCTB,5500,4100,50,20,bouteille,,
EM-1.5-003,0610098765432,Eau Minérale 1.5L,Boissons,Eaux,SABC,400,250,200,50,bouteille,,
RIZ-25-002,0640055667788,Riz Parfumé 25kg,Épicerie,Riz,Import Asie,22000,17500,42,15,sac,,`;
  }
}
