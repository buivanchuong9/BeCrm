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

export class AvailabilitySlotResponseDto {
  @ApiProperty({ description: 'Signed opaque reference required by booking/rescheduling.' })
  slotId!: string;
  @ApiProperty({ format: 'date-time' }) startsAt!: string;
  @ApiProperty({ format: 'date-time' }) endsAt!: string;
  @ApiProperty({ minimum: 1 }) remainingCapacity!: number;
}

export class PractitionerAvailabilityResponseDto {
  @ApiProperty({ format: 'uuid' }) practitionerId!: string;
  @ApiProperty({ format: 'uuid' }) clinicLocationId!: string;
  @ApiProperty({ required: false, nullable: true }) timezone!: string | null;
  @ApiProperty({ format: 'date' }) date!: string;
  @ApiProperty({ required: false, nullable: true, minimum: 5, maximum: 240 })
  slotDurationMinutes!: number | null;
  @ApiProperty({ required: false, nullable: true, minimum: 1 }) capacity!: number | null;
  @ApiProperty({ type: [AvailabilitySlotResponseDto] }) slots!: AvailabilitySlotResponseDto[];
}
