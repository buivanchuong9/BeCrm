import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateNarrativeDto {
  @IsOptional() @IsString() @MaxLength(200) occupation?: string;
  @IsOptional() @IsString() @MaxLength(1000) chiefComplaint?: string;
  @IsOptional() @IsString() @MaxLength(5000) medicalHistory?: string;
  @IsOptional() @IsString() @MaxLength(5000) familyHistory?: string;
  @IsOptional() @IsString() @MaxLength(2000) currentSymptoms?: string;
  @IsOptional() @IsString() @MaxLength(2000) lifestyle?: string;
  @IsOptional() @IsString() @MaxLength(5000) surgicalHistory?: string;
  @IsOptional() @IsString() @MaxLength(3000) vaccinationNotes?: string;
}
