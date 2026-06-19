import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  employeeNumber: string; // Ex: "EMP001"

  @IsString()
  @MinLength(4)
  pin: string; // PIN 4 chiffres
}
