import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCurrentMedicationDto {
  @IsString() @MaxLength(200) medicationName!: string;
  @IsOptional() @IsString() @MaxLength(100) dosage?: string;
  @IsOptional() @IsString() @MaxLength(100) frequency?: string;
  @IsOptional() @IsString() @MaxLength(50) route?: string;
  @IsOptional() @IsDateString() startedAt?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class UpdateCurrentMedicationDto {
  @IsOptional() @IsString() @MaxLength(200) medicationName?: string;
  @IsOptional() @IsString() @MaxLength(100) dosage?: string;
  @IsOptional() @IsString() @MaxLength(100) frequency?: string;
  @IsOptional() @IsString() @MaxLength(50) route?: string;
  @IsOptional() @IsDateString() startedAt?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}
