import { IsString, IsInt, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  category: string;

  @IsString()
  @IsOptional()
  subCategory?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsInt()
  @Min(0)
  price: number;

  @IsInt()
  @Min(0)
  costPrice: number;

  @IsNumber()
  @IsOptional()
  taxRate?: number;

  @IsInt()
  @Min(0)
  stock: number;

  @IsInt()
  @Min(0)
  minStock: number;

  @IsString()
  unit: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  // Date d'expiration (ISO string) — optionnelle, surtout pour les produits périssables
  @IsString()
  @IsOptional()
  expiryDate?: string;
}
