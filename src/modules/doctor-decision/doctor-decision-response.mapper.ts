import {
  ClinicalPlan,
  ClinicalPlanOrderRef,
  ClinicalPlanRevision,
  DoctorDiagnosis,
  DoctorReview,
} from '@prisma/client';
import {
  ClinicalPlanResponseDto,
  ClinicalPlanRevisionResponseDto,
  DoctorDiagnosisResponseDto,
  DoctorReviewResponseDto,
} from './dto/responses/doctor-decision-response.dto';

export function toDoctorReviewResponse(review: DoctorReview): DoctorReviewResponseDto {
  return {
    id: review.id,
    encounterId: review.encounterId,
    aiAssessmentId: review.aiAssessmentId,
    doctorId: review.doctorId,
    action: review.action,
    acceptedConditionCode: review.acceptedConditionCode,
    rationale: review.rationale,
    reviewedAt: review.reviewedAt.toISOString(),
  };
}

export function toDoctorDiagnosisResponse(diagnosis: DoctorDiagnosis): DoctorDiagnosisResponseDto {
  return {
    id: diagnosis.id,
    encounterId: diagnosis.encounterId,
    doctorId: diagnosis.doctorId,
    status: diagnosis.status,
    conditionName: diagnosis.conditionName,
    conditionCode: diagnosis.conditionCode,
    aiAssessmentId: diagnosis.aiAssessmentId,
    isAdditionalToAI: diagnosis.isAdditionalToAI,
    rationale: diagnosis.rationale,
    revisionOfId: diagnosis.revisionOfId,
    version: diagnosis.version,
    recordedAt: diagnosis.recordedAt.toISOString(),
  };
}

export function toClinicalPlanResponse(
  plan: ClinicalPlan & { orderRefs?: ClinicalPlanOrderRef[] },
  autoActivatedWorkflowInstanceId: string | null = null,
): ClinicalPlanResponseDto {
  return {
    id: plan.id,
    encounterId: plan.encounterId,
    doctorId: plan.doctorId,
    diagnosisId: plan.diagnosisId,
    problemOrDiagnosisId: plan.diagnosisId,
    summary: plan.summary,
    measurableGoals: plan.measurableGoals,
    protocolRef:
      plan.protocolTemplateId && plan.protocolTemplateVersionId
        ? {
            templateId: plan.protocolTemplateId,
            templateVersionId: plan.protocolTemplateVersionId,
          }
        : null,
    milestones: plan.milestones as unknown[],
    monitoringMetrics: plan.monitoringMetrics,
    stopOrChangeCriteria: plan.stopOrChangeCriteria,
    contraindications: plan.contraindications,
    prerequisites: plan.prerequisites,
    responsibleProviderId: plan.responsibleProviderId,
    deviationFromProtocol: plan.deviationFromProtocol,
    outcome: plan.outcome,
    currentStage: plan.currentStage,
    signedBy: plan.signedBy,
    signedAt: plan.signedAt?.toISOString() ?? null,
    signature:
      plan.signedBy && plan.signedAt
        ? { providerId: plan.signedBy, signedAt: plan.signedAt.toISOString() }
        : null,
    version: plan.version,
    orderRefs: (plan.orderRefs ?? []).map((ref) => ({
      id: ref.id,
      kind: ref.kind,
      referenceId: ref.referenceId,
    })),
    orders: (plan.orderRefs ?? []).map((ref) => ({
      id: ref.id,
      kind: ref.kind,
      referenceId: ref.referenceId,
    })),
    approvedAt: plan.approvedAt.toISOString(),
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    autoActivatedWorkflowInstanceId,
  };
}

export function toClinicalPlanRevisionResponse(
  revision: ClinicalPlanRevision,
): ClinicalPlanRevisionResponseDto {
  return {
    id: revision.id,
    planId: revision.planId,
    version: revision.version,
    action: revision.action,
    snapshot: revision.snapshot,
    actorId: revision.actorId,
    occurredAt: revision.occurredAt.toISOString(),
  };
}
