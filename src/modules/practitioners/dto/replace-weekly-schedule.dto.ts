import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class WeeklyScheduleWindowRequest {
  @ApiProperty({ minimum: 0, maximum: 6, description: 'Day of week, 0 = Sunday .. 6 = Saturday.' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ minimum: 0, maximum: 1440, description: 'Minutes after clinic-local midnight.' })
  @IsInt()
  @Min(0)
  @Max(1440)
  startMinute!: number;

  @ApiProperty({ minimum: 0, maximum: 1440, description: 'Minutes after clinic-local midnight.' })
  @IsInt()
  @Min(0)
  @Max(1440)
  endMinute!: number;

  @ApiProperty({ required: false, format: 'date', description: 'Defaults to today.' })
  @IsOptional()
  @IsDateString({ strict: true })
  effectiveFrom?: string;

  @ApiProperty({ required: false, nullable: true, format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  effectiveTo?: string;
}

export class ReplaceWeeklyScheduleRequest {
  @ApiProperty({
    type: [WeeklyScheduleWindowRequest],
    description: 'The full set of recurring weekly working windows; replaces any existing ones.',
  })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => WeeklyScheduleWindowRequest)
  windows!: WeeklyScheduleWindowRequest[];
}
