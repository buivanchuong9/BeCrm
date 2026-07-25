import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export const LIFETIME_RECORD_EVENT_TYPES = [
  'encounter',
  'diagnosis',
  'procedure',
  'prescription',
  'laboratory',
  'imaging',
  'vaccination',
  'allergy',
  'document',
  'care_plan',
] as const;

export type LifetimeRecordEventType = (typeof LIFETIME_RECORD_EVENT_TYPES)[number];

export class LifetimeMedicalRecordQuery {
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
  @IsOptional() @IsUUID() organizationId?: string;
  @IsOptional() @IsUUID() facilityId?: string;
  @IsOptional() @IsIn(LIFETIME_RECORD_EVENT_TYPES) type?: LifetimeRecordEventType;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
