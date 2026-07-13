import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePurchaseOrderItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitCost: number;

  // Champs optionnels pour la création de produit depuis le bordereau
  @IsBoolean()
  @IsOptional()
  isNewProduct?: boolean;

  @IsString()
  @IsOptional()
  newProductName?: string;

  @IsString()
  @IsOptional()
  newProductBarcode?: string;

  @IsString()
  @IsOptional()
  newProductCategory?: string;

  @IsString()
  @IsOptional()
  newProductUnit?: string;

  @IsNumber()
  @IsOptional()
  sellPrice?: number;

  @IsString()
  @IsOptional()
  expiryDate?: string;
}

export class CreatePurchaseOrderDto {
  @IsString()
  supplierId: string;

  @IsString()
  @IsOptional()
  expectedDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @IsString()
  @IsOptional()
  createdBy?: string; // employeeId

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items: CreatePurchaseOrderItemDto[];
}
