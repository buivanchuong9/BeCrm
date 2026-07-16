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
] as const;

export class QueueTicketResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) appointmentId!: string;
  @ApiProperty({ format: 'uuid' }) patientId!: string;
  @ApiProperty({ format: 'uuid' }) encounterId!: string;
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
