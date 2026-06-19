import { IsString, IsInt, IsOptional, IsBoolean, Min, Max, Matches } from 'class-validator';

export class CreateScheduleDto {
  @IsString()
  employeeId: string;

  @IsString()
  registerId: string;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number; // 0=dimanche, 1=lundi, ..., 6=samedi

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime doit être au format HH:mm' })
  startTime: string; // "08:00"

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime doit être au format HH:mm' })
  endTime: string; // "17:00"

  @IsString()
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'breakStart doit être au format HH:mm' })
  breakStart?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'breakEnd doit être au format HH:mm' })
  breakEnd?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateScheduleDto {
  @IsString()
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime doit être au format HH:mm' })
  startTime?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime doit être au format HH:mm' })
  endTime?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'breakStart doit être au format HH:mm' })
  breakStart?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'breakEnd doit être au format HH:mm' })
  breakEnd?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
