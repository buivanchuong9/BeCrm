import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class AnalyzeSkinCaseRequest {
  @IsString()
  @MaxLength(100)
  bodyRegion!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(36_500)
  durationDays?: number;

  /** JSON-encoded string array because the request is multipart/form-data. */
  @IsOptional()
  @IsString()
  @MaxLength(3_000)
  symptoms?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  encounterId?: string;
}
