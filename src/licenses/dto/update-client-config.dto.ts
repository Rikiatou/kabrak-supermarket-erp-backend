import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class UpdateClientConfigDto {
  @IsOptional() @IsString()
  supermarketName?: string;

  @IsOptional() @IsString()
  supermarketSlogan?: string;

  @IsOptional() @IsString()
  logoUrl?: string;

  @IsOptional() @IsString()
  primaryColor?: string;

  @IsOptional() @IsString()
  address?: string;

  @IsOptional() @IsString()
  phone?: string;

  @IsOptional() @IsString()
  email?: string;

  @IsOptional() @IsString()
  website?: string;

  @IsOptional() @IsString()
  receiptHeader?: string;

  @IsOptional() @IsString()
  receiptFooter?: string;

  @IsOptional() @IsBoolean()
  receiptShowLogo?: boolean;

  @IsOptional() @IsString()
  invoiceFooter?: string;

  @IsOptional() @IsString()
  currency?: string;

  @IsOptional() @IsNumber()
  taxRate?: number;

  @IsOptional() @IsBoolean()
  enableLoyalty?: boolean;

  @IsOptional() @IsBoolean()
  enableAutoPrint?: boolean;
}
