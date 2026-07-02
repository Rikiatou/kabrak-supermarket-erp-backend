import { IsString, IsOptional, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchProductDto {
  @IsString()
  @IsOptional()
  q?: string; // Query (nom, SKU, barcode)

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  // Filtre statut stock: critical (rupture), low (stock faible), ok (stock ok)
  @IsString()
  @IsOptional()
  @IsIn(['critical', 'low', 'ok'])
  stockStatus?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 100;
}
