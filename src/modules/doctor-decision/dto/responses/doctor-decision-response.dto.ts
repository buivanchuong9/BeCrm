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
  @ApiProperty({ format: 'uuid' }) problemOrDiagnosisId!: string;
  @ApiProperty() summary!: string;
  @ApiProperty({ type: [String] }) measurableGoals!: string[];
  @ApiProperty({
    nullable: true,
    type: Object,
    example: {
      templateId: '08d0f54a-c230-42d9-878d-0ea23791432c',
      templateVersionId: '6c9aa506-fb32-463d-9e83-ddbfebc14235',
    },
  })
  protocolRef!: { templateId: string; templateVersionId: string } | null;
  @ApiProperty({ type: [Object] }) milestones!: unknown[];
  @ApiProperty({ type: [String] }) monitoringMetrics!: string[];
  @ApiProperty() stopOrChangeCriteria!: string;
  @ApiProperty({ type: [String] }) contraindications!: string[];
  @ApiProperty({ type: [String] }) prerequisites!: string[];
  @ApiProperty({ format: 'uuid' }) responsibleProviderId!: string;
  @ApiProperty({ nullable: true, type: Object }) deviationFromProtocol!: unknown | null;
  @ApiProperty({ nullable: true }) outcome!: string | null;
  @ApiProperty({
    enum: ['induction', 'monitoring', 'response_assessment', 'maintenance'],
  })
  currentStage!: 'induction' | 'monitoring' | 'response_assessment' | 'maintenance';
  @ApiProperty({ format: 'uuid', nullable: true }) signedBy!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true }) signedAt!: string | null;
  @ApiProperty({ nullable: true, type: Object })
  signature!: { providerId: string; signedAt: string } | null;
  @ApiProperty() version!: number;
  @ApiProperty({ type: [Object] })
  orderRefs!: Array<{ id: string; kind: string; referenceId: string }>;
  @ApiProperty({ type: [Object] })
  orders!: Array<{ id: string; kind: string; referenceId: string }>;
  @ApiProperty({ format: 'date-time' }) approvedAt!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
  @ApiProperty({
    format: 'uuid',
    nullable: true,
    description: 'Set once the Workflow module auto-activates an instance from this plan.',
  })
  autoActivatedWorkflowInstanceId!: string | null;
}

export class ClinicalPlanRevisionResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) planId!: string;
  @ApiProperty() version!: number;
  @ApiProperty() action!: string;
  @ApiProperty({ type: Object }) snapshot!: unknown;
  @ApiProperty({ format: 'uuid' }) actorId!: string;
  @ApiProperty({ format: 'date-time' }) occurredAt!: string;
}
