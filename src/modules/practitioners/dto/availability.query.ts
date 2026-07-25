import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsOptional, IsUUID } from 'class-validator';

export class AvailabilityQuery {
  @IsDateString({ strict: true })
  date!: string;

  @IsOptional()
  @IsUUID()
  clinicLocationId?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeUnavailable = false;
}
