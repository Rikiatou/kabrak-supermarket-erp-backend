import { IsNumber, IsString, IsOptional } from 'class-validator';

export class CloseShiftDto {
  @IsNumber()
  closingCash: number;

  @IsNumber()
  @IsOptional()
  expectedCash?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
