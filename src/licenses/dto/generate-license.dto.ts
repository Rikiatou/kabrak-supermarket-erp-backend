import { IsString, IsEmail, IsInt, IsOptional, Min, Max, IsIn } from 'class-validator';

export class GenerateLicenseDto {
  @IsString()
  clientName: string;

  @IsEmail()
  clientEmail: string;

  @IsString()
  clientPhone: string;

  @IsOptional()
  @IsString()
  clientAddress?: string;

  // Subdomain pour multi-tenant SaaS (ex: "easyshop" -> easyshop.kabrak-retail.com)
  @IsOptional()
  @IsString()
  subdomain?: string;

  // STANDARD (1 magasin) ou MULTI_STORE (X magasins)
  @IsIn(['STANDARD', 'MULTI_STORE'])
  type: 'STANDARD' | 'MULTI_STORE';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxStores?: number; // Pour MULTI_STORE

  // Durée en mois: 1 (démo), 6 ou 12
  @IsInt()
  @IsIn([1, 6, 12])
  durationMonths: number;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}
