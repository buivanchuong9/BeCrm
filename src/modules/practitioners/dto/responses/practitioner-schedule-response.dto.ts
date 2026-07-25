import { ApiProperty } from '@nestjs/swagger';

const EXCEPTION_KIND_VALUES = ['unavailable', 'override'] as const;

export class ScheduleWindowResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ minimum: 0, maximum: 6 }) dayOfWeek!: number;
  @ApiProperty({ minimum: 0, maximum: 1440 }) startMinute!: number;
  @ApiProperty({ minimum: 0, maximum: 1440 }) endMinute!: number;
  @ApiProperty({ format: 'date' }) effectiveFrom!: string;
  @ApiProperty({ required: false, nullable: true, format: 'date' }) effectiveTo!: string | null;
}

export class ScheduleExceptionResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: EXCEPTION_KIND_VALUES }) kind!: string;
  @ApiProperty({ format: 'date-time' }) startsAt!: string;
  @ApiProperty({ format: 'date-time' }) endsAt!: string;
  @ApiProperty({ required: false, nullable: true }) reason!: string | null;
}

export class ScheduleExceptionDeletedResponseDto {
  @ApiProperty() deleted!: boolean;
}

export class PractitionerScheduleResponseDto {
  @ApiProperty({ format: 'uuid' }) practitionerId!: string;
  @ApiProperty({ format: 'uuid' }) clinicLocationId!: string;
  @ApiProperty({ format: 'uuid' }) assignmentId!: string;
  @ApiProperty() timezone!: string;
  @ApiProperty({ minimum: 5, maximum: 240 }) slotDurationMinutes!: number;
  @ApiProperty({ minimum: 1 }) capacity!: number;
  @ApiProperty({ type: [ScheduleWindowResponseDto] }) weeklySchedule!: ScheduleWindowResponseDto[];
  @ApiProperty({ type: [ScheduleExceptionResponseDto] })
  exceptions!: ScheduleExceptionResponseDto[];
}
