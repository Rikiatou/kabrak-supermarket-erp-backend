import { IsString, IsInt, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTransactionItemDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsInt()
  @Min(0)
  unitPrice: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  discount?: number;

  @IsInt()
  @Min(0)
  tax: number;

  @IsInt()
  @Min(0)
  total: number;
}

export class CreateTransactionDto {
  @IsString()
  cashierId: string;

  @IsString()
  @IsOptional()
  registerId?: string;

  @IsInt()
  @Min(0)
  subtotal: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  discount?: number;

  @IsInt()
  @Min(0)
  tax: number;

  @IsInt()
  @Min(0)
  total: number;

  @IsString()
  paymentMethod: string; // "cash", "card", "mobile", "orange", "split"

  @IsInt()
  @Min(0)
  @IsOptional()
  cashGiven?: number;

  @IsInt()
  @IsOptional()
  change?: number;

  @IsString()
  @IsOptional()
  splitBreakdown?: string; // JSON: {cash, card, mobile, orange}

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTransactionItemDto)
  items: CreateTransactionItemDto[];
}
