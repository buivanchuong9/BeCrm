import { ApiProperty } from '@nestjs/swagger';

const TASK_STATUS_VALUES = [
  'pending',
  'blocked',
  'ready',
  'assigned',
  'accepted',
  'in_progress',
  'waiting_for_patient',
  'waiting_for_result',
  'waiting_for_approval',
  'completed',
  'failed',
  'rejected',
  'redo_required',
  'skipped',
  'cancelled',
  'expired',
  'escalated',
] as const;
const PRIORITY_VALUES = ['low', 'medium', 'high'] as const;
const URGENCY_VALUES = ['routine', 'urgent', 'emergency'] as const;

export class WorkflowTaskResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) instanceId!: string;
  @ApiProperty({ format: 'uuid' }) encounterId!: string;
  @ApiProperty() stepCode!: string;
  @ApiProperty() name!: string;
  @ApiProperty() responsibleRole!: string;
  @ApiProperty() department!: string;
  @ApiProperty({ enum: TASK_STATUS_VALUES }) status!: (typeof TASK_STATUS_VALUES)[number];
  @ApiProperty({ format: 'uuid', nullable: true }) assigneeId!: string | null;
  @ApiProperty({ type: [String] }) dependsOnStepCodes!: string[];
  @ApiProperty() slaMinutes!: number;
  @ApiProperty({ enum: PRIORITY_VALUES }) priority!: (typeof PRIORITY_VALUES)[number];
  @ApiProperty({ enum: URGENCY_VALUES }) urgency!: (typeof URGENCY_VALUES)[number];
  @ApiProperty() mandatory!: boolean;
  @ApiProperty({ nullable: true }) clinicalWarning!: string | null;
  @ApiProperty() reworkCount!: number;
  @ApiProperty() version!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time', nullable: true }) startedAt!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true }) completedAt!: string | null;
}
