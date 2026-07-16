import { ClinicalPlan, DoctorDiagnosis, DoctorReview } from '@prisma/client';
import {
  ClinicalPlanResponseDto,
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
  plan: ClinicalPlan,
  autoActivatedWorkflowInstanceId: string | null = null,
): ClinicalPlanResponseDto {
  return {
    id: plan.id,
    encounterId: plan.encounterId,
    doctorId: plan.doctorId,
    diagnosisId: plan.diagnosisId,
    summary: plan.summary,
    approvedAt: plan.approvedAt.toISOString(),
    autoActivatedWorkflowInstanceId,
  };
}
