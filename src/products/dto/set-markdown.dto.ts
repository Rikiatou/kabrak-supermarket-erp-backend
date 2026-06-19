import { IsInt, IsString, IsOptional, IsDateString, Min, Max } from 'class-validator';

export class SetMarkdownDto {
  @IsInt()
  @Min(0)
  markdownPrice: number;

  @IsString()
  markdownReason: 'expiry' | 'near_expiry' | 'clearance' | 'promo';

  @IsString()
  @IsOptional()
  markdownNote?: string;

  @IsDateString()
  @IsOptional()
  markdownExpiresAt?: string; // ISO date — auto-restauration du prix après cette date
}
