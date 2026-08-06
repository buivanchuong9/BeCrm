import { ApiProperty } from '@nestjs/swagger';

const PRIORITY_VALUES = ['normal', 'priority', 'urgent'] as const;
const STATUS_VALUES = [
  'waiting',
  'called',
  'acknowledged',
  'in_service',
  'skipped',
  'completed',
  'routed',
  'cancelled',
  'no_show',
] as const;
const SOURCE_VALUES = ['appointment', 'walk_in', 'legacy'] as const;

export class QueueTicketResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid', nullable: true }) appointmentId!: string | null;
  @ApiProperty({ format: 'uuid' }) patientId!: string;
  @ApiProperty({ format: 'uuid', nullable: true }) encounterId!: string | null;
  @ApiProperty({ format: 'uuid', nullable: true }) checkInId!: string | null;
  @ApiProperty({ enum: SOURCE_VALUES }) sourceType!: (typeof SOURCE_VALUES)[number];
  @ApiProperty({ format: 'date' }) clinicDate!: string;
  @ApiProperty() number!: string;
  @ApiProperty() department!: string;
  @ApiProperty() serviceStation!: string;
  @ApiProperty({ nullable: true }) room!: string | null;
  @ApiProperty() waitingArea!: string;
  @ApiProperty({ enum: PRIORITY_VALUES }) priority!: (typeof PRIORITY_VALUES)[number];
  @ApiProperty({ enum: STATUS_VALUES }) status!: (typeof STATUS_VALUES)[number];
  @ApiProperty({ format: 'date-time' }) issuedAt!: string;
  @ApiProperty({ format: 'date-time', nullable: true }) calledAt!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true }) acknowledgedAt!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true }) serviceStartedAt!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true }) completedAt!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true }) skippedAt!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true }) cancelledAt!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true }) noShowAt!: string | null;
  @ApiProperty() peopleAhead!: number;
  @ApiProperty() estimatedWaitMinutes!: number;
  @ApiProperty({ type: [String] }) preparationInstructions!: string[];
  @ApiProperty({ nullable: true }) nextStation!: string | null;
  @ApiProperty() version!: number;
}

export class QueueStationSummaryResponseDto {
  @ApiProperty() serviceStation!: string;
  @ApiProperty() waiting!: number;
  @ApiProperty() called!: number;
  @ApiProperty() inService!: number;
}

export class ReceptionSummaryResponseDto {
  @ApiProperty() upcomingAppointments!: number;
  @ApiProperty() waitingCount!: number;
  @ApiProperty() inServiceCount!: number;
}
