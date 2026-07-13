import { IsString, IsInt, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateExpenseDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  category: string; // "rent", "utilities", "salaries", "supplies", "transport", "taxes", "other"

  @IsString()
  description: string;

  @IsInt()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  paymentMethod?: string; // "cash", "card", "mobile"

  @IsString()
  @IsOptional()
  supplier?: string;

  @IsString()
  @IsOptional()
  createdBy?: string; // employeeId
}
