import { IsString } from 'class-validator';

export class ValidateLicenseDto {
  @IsString()
  licenseKey: string;
}
