import { IsString, IsInt, IsOptional, Min } from 'class-validator';

export class CreateStockMovementDto {
  @IsString()
  productId: string;

  @IsString()
  type: string; // "in", "out", "adjustment", "loss"

  @IsInt()
  quantity: number; // Positif = entrée, Négatif = sortie

  @IsString()
  @IsOptional()
  reason?: string; // "purchase", "sale", "expiry", "damage", "theft", "adjustment"

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  createdBy?: string;
}
