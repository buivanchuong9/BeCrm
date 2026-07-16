import { ApiProperty } from '@nestjs/swagger';

const REVIEW_ACTION_VALUES = ['pending', 'accepted', 'partial', 'rejected'] as const;

export class DoctorReviewResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) encounterId!: string;
  @ApiProperty({ format: 'uuid', nullable: true }) aiAssessmentId!: string | null;
  @ApiProperty({ format: 'uuid' }) doctorId!: string;
  @ApiProperty({ enum: REVIEW_ACTION_VALUES }) action!: (typeof REVIEW_ACTION_VALUES)[number];
  @ApiProperty({ nullable: true }) acceptedConditionCode!: string | null;
  @ApiProperty({ nullable: true }) rationale!: string | null;
  @ApiProperty({ format: 'date-time' }) reviewedAt!: string;
}

const DIAGNOSIS_STATUS_VALUES = [
  'none',
  'provisional',
  'differential',
  'confirmed',
  'revised',
  'signed',
] as const;

export class DoctorDiagnosisResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) encounterId!: string;
  @ApiProperty({ format: 'uuid' }) doctorId!: string;
  @ApiProperty({ enum: DIAGNOSIS_STATUS_VALUES }) status!: (typeof DIAGNOSIS_STATUS_VALUES)[number];
  @ApiProperty() conditionName!: string;
  @ApiProperty({ nullable: true }) conditionCode!: string | null;
  @ApiProperty({ format: 'uuid', nullable: true }) aiAssessmentId!: string | null;
  @ApiProperty() isAdditionalToAI!: boolean;
  @ApiProperty({ nullable: true }) rationale!: string | null;
  @ApiProperty({ format: 'uuid', nullable: true }) revisionOfId!: string | null;
  @ApiProperty() version!: number;
  @ApiProperty({ format: 'date-time' }) recordedAt!: string;
}

export class ClinicalPlanResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) encounterId!: string;
  @ApiProperty({ format: 'uuid' }) doctorId!: string;
  @ApiProperty({ format: 'uuid' }) diagnosisId!: string;
  @ApiProperty() summary!: string;
  @ApiProperty({ format: 'date-time' }) approvedAt!: string;
  @ApiProperty({
    format: 'uuid',
    nullable: true,
    description: 'Set once the Workflow module auto-activates an instance from this plan.',
  })
  autoActivatedWorkflowInstanceId!: string | null;
}
