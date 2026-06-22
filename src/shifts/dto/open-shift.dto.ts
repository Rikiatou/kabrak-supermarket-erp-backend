import { IsString, IsNumber, IsOptional } from 'class-validator';

export class OpenShiftDto {
  @IsString()
  registerId: string;

  @IsString()
  @IsOptional()
  registerName?: string;

  @IsString()
  employeeId: string;

  @IsString()
  @IsOptional()
  employeeName?: string;

  @IsNumber()
  openingCash: number;
}
