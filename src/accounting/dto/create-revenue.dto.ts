import { IsString, IsInt, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateRevenueDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  category: string; // "sales", "services", "other"

  @IsString()
  description: string;

  @IsInt()
  @Min(0)
  amount: number;
}
