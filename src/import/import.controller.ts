import {
  Controller,
  Get,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from './import.service';

@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  // Import via texte CSV (body)
  @Post('products')
  async importProducts(@Body('csv') csv: string) {
    if (!csv) {
      throw new Error('Données CSV manquantes');
    }
    return this.importService.importProducts(csv);
  }

  // Import via fichier upload
  @Post('products/file')
  @UseInterceptors(FileInterceptor('file'))
  async importProductsFile(@UploadedFile() file: any) {
    if (!file) {
      throw new Error('Fichier manquant');
    }
    const csvText = file.buffer.toString('utf-8');
    return this.importService.importProducts(csvText);
  }

  // Template CSV
  @Get('products/template')
  getTemplate() {
    return {
      contentType: 'text/csv',
      filename: 'kabrak-products-template.csv',
      content: this.importService.getTemplate(),
      headers: [
        'sku (obligatoire)',
        'barcode (obligatoire)',
        'name (obligatoire)',
        'category (obligatoire)',
        'subCategory (optionnel)',
        'brand (optionnel)',
        'price (obligatoire, en FCFA)',
        'costPrice (optionnel, en FCFA)',
        'stock (obligatoire)',
        'minStock (optionnel, défaut: 10)',
        'unit (optionnel, défaut: pièce)',
        'expiryDate (optionnel, format: YYYY-MM-DD)',
        'imageUrl (optionnel)',
      ],
    };
  }
}
