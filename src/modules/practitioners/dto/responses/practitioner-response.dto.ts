import { ApiProperty } from '@nestjs/swagger';

export class PractitionerSpecialtyResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() primary!: boolean;
}

export class PractitionerClinicAssignmentResponseDto {
  @ApiProperty({ format: 'uuid' }) clinicLocationId!: string;
  @ApiProperty() clinicName!: string;
  @ApiProperty({ format: 'uuid' }) departmentId!: string;
  @ApiProperty() departmentCode!: string;
  @ApiProperty() departmentName!: string;
  @ApiProperty({ minimum: 5, maximum: 240 }) slotDurationMinutes!: number;
  @ApiProperty({ minimum: 1 }) capacity!: number;
}

export class PractitionerResponseDto {
  @ApiProperty({ format: 'uuid', description: 'The practitioner user id.' }) id!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty({ required: false, nullable: true, format: 'uuid' }) avatarFileId!: string | null;
  @ApiProperty({ required: false, nullable: true }) title!: string | null;
  @ApiProperty({ required: false, nullable: true }) bio!: string | null;
  @ApiProperty({ enum: ['active', 'inactive'] }) status!: 'active' | 'inactive';
  @ApiProperty({ type: [PractitionerSpecialtyResponseDto] })
  specialties!: PractitionerSpecialtyResponseDto[];
  @ApiProperty({ type: [PractitionerClinicAssignmentResponseDto] })
  clinicAssignments!: PractitionerClinicAssignmentResponseDto[];
}

const SLOT_STATUS_VALUES = ['AVAILABLE', 'FULL', 'BLOCKED', 'BREAK', 'PAST'] as const;
const UNAVAILABLE_REASON_CODE_VALUES = [
  'CAPACITY_REACHED',
  'PRACTITIONER_LEAVE',
  'CLINIC_CLOSED',
  'SCHEDULE_BLOCKED',
  'BREAK_TIME',
  'SLOT_IN_PAST',
] as const;
const SCHEDULE_BREAK_REASON_CODE_VALUES = ['BREAK_TIME', 'SCHEDULE_BLOCKED'] as const;

export class UnavailableReasonResponseDto {
  @ApiProperty({ enum: UNAVAILABLE_REASON_CODE_VALUES }) code!: string;
  @ApiProperty() display!: string;
}

export class AvailabilitySlotResponseDto {
  @ApiProperty({ description: 'Signed opaque reference required by booking/rescheduling.' })
  slotId!: string;
  @ApiProperty({ format: 'date-time' }) startsAt!: string;
  @ApiProperty({ format: 'date-time' }) endsAt!: string;
  @ApiProperty({ minimum: 1 }) capacity!: number;
  @ApiProperty({ minimum: 0 }) bookedCount!: number;
  @ApiProperty({ minimum: 0 }) remainingCapacity!: number;
  @ApiProperty({ enum: SLOT_STATUS_VALUES }) status!: string;
  @ApiProperty() selectable!: boolean;
  @ApiProperty({ type: UnavailableReasonResponseDto, required: false, nullable: true })
  unavailableReason!: UnavailableReasonResponseDto | null;
}

export class ScheduleBreakResponseDto {
  @ApiProperty({ format: 'date-time' }) startsAt!: string;
  @ApiProperty({ format: 'date-time' }) endsAt!: string;
  @ApiProperty({ enum: SCHEDULE_BREAK_REASON_CODE_VALUES }) reasonCode!: string;
}

export class ScheduleResponseDto {
  @ApiProperty({ format: 'date-time' }) startsAt!: string;
  @ApiProperty({ format: 'date-time' }) endsAt!: string;
  @ApiProperty({ type: [ScheduleBreakResponseDto] }) breaks!: ScheduleBreakResponseDto[];
}

export class NextAvailableDateResponseDto {
  @ApiProperty({ format: 'date' }) date!: string;
  @ApiProperty({ minimum: 1 }) availableSlotCount!: number;
  @ApiProperty({ format: 'date-time' }) firstAvailableAt!: string;
}

export class PractitionerAvailabilityResponseDto {
  @ApiProperty({ format: 'uuid' }) practitionerId!: string;
  @ApiProperty({ format: 'uuid' }) clinicLocationId!: string;
  @ApiProperty({ required: false, nullable: true }) timezone!: string | null;
  @ApiProperty({ format: 'date' }) date!: string;
  @ApiProperty() workingDay!: boolean;
  @ApiProperty({ required: false, nullable: true, minimum: 5, maximum: 240 })
  slotDurationMinutes!: number | null;
  @ApiProperty({ required: false, nullable: true, minimum: 1 }) capacity!: number | null;
  @ApiProperty({ required: false, nullable: true, minimum: 1 }) defaultCapacity!: number | null;
  @ApiProperty({ type: ScheduleResponseDto, required: false, nullable: true })
  schedule!: ScheduleResponseDto | null;
  @ApiProperty({ type: [AvailabilitySlotResponseDto] }) slots!: AvailabilitySlotResponseDto[];
  @ApiProperty({ type: [NextAvailableDateResponseDto] })
  nextAvailableDates!: NextAvailableDateResponseDto[];
  @ApiProperty({ format: 'date-time' }) generatedAt!: string;
}
