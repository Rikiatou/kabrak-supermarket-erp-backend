import { IsString, IsInt, IsIn } from 'class-validator';

export class RenewLicenseDto {
  @IsString()
  licenseKey: string;

  // Prolonger de 6 ou 12 mois
  @IsInt()
  @IsIn([6, 12])
  durationMonths: number;
}
