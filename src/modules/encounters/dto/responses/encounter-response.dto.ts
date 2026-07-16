import { ApiProperty } from '@nestjs/swagger';

const TYPE_VALUES = ['standard', 'emergency', 'follow_up', 'remote'] as const;
const ORIGIN_VALUES = ['appointment', 'walk_in', 'follow_up_request'] as const;
const STATUS_VALUES = [
  'registered',
  'intake_in_progress',
  'intake_complete',
  'ai_assessed',
  'routed',
  'checked_in',
  'under_doctor_review',
  'awaiting_results',
  'diagnosed',
  'plan_approved',
  'workflow_active',
  'in_progress',
  'results_complete',
  'final_review',
  'discharge_ready',
  'record_signed',
  'closed',
  'post_visit_monitoring',
  'escalated',
  'follow_up_linked',
] as const;

export class EncounterResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) patientId!: string;
  @ApiProperty({ format: 'uuid', nullable: true }) parentEncounterId!: string | null;
  @ApiProperty({ format: 'uuid', nullable: true }) appointmentId!: string | null;
  @ApiProperty({ enum: TYPE_VALUES }) type!: (typeof TYPE_VALUES)[number];
  @ApiProperty({ enum: ORIGIN_VALUES }) origin!: (typeof ORIGIN_VALUES)[number];
  @ApiProperty({ enum: STATUS_VALUES }) status!: (typeof STATUS_VALUES)[number];
  @ApiProperty() department!: string;
  @ApiProperty({ nullable: true }) room!: string | null;
  @ApiProperty({ nullable: true }) queueNumber!: string | null;
  @ApiProperty({ nullable: true }) peopleAheadInQueue!: number | null;
  @ApiProperty({ nullable: true }) estimatedWaitMinutes!: number | null;
  @ApiProperty({ format: 'uuid', nullable: true }) currentDoctorId!: string | null;
  @ApiProperty({ nullable: true }) blockingCondition!: string | null;
  @ApiProperty() version!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

const EVENT_KIND_VALUES = ['info', 'warning', 'success', 'danger'] as const;

export class EncounterEventResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'date-time' }) at!: string;
  @ApiProperty() label!: string;
  @ApiProperty({ enum: EVENT_KIND_VALUES }) kind!: (typeof EVENT_KIND_VALUES)[number];
}
