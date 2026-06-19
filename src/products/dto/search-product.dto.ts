import { IsString, IsOptional, IsInt, Min } from 'class-validator';

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

  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 100;
}
