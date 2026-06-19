import { IsNumber, IsString, IsOptional } from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  amount: number;

  @IsString()
  method: string; // "cash", "card", "mobile", "transfer"

  @IsOptional()
  @IsString()
  note?: string;
}
