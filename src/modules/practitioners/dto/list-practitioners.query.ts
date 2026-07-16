import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class ListPractitionersQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsUUID() clinicLocationId?: string;
  @IsOptional() @IsUUID() specialtyId?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() activeOnly = true;
}
