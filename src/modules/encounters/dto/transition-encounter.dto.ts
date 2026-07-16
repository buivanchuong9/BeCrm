import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

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

export class TransitionEncounterRequest {
  @ApiProperty({ enum: STATUS_VALUES })
  @IsIn(STATUS_VALUES)
  toStatus!: (typeof STATUS_VALUES)[number];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  blockingCondition?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  version!: number;
}
