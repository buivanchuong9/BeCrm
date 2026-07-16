import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class AvailabilityQuery {
  @IsDateString({ strict: true })
  date!: string;

  @IsOptional()
  @IsUUID()
  clinicLocationId?: string;
}
