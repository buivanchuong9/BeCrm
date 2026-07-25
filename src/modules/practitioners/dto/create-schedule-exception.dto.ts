import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const EXCEPTION_KIND_VALUES = ['unavailable', 'override'] as const;

export class CreateScheduleExceptionRequest {
  @ApiProperty({
    enum: EXCEPTION_KIND_VALUES,
    description:
      '"unavailable" blocks the range (leave, meeting); "override" adds availability outside the weekly schedule.',
  })
  @IsIn(EXCEPTION_KIND_VALUES)
  kind!: (typeof EXCEPTION_KIND_VALUES)[number];

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  endsAt!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
