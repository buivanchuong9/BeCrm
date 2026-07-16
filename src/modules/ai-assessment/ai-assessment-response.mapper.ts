import { AIPreliminaryAssessment, SymptomIntake } from '@prisma/client';
import { CandidateCondition } from './ai-scoring.util';
import { AIAssessmentResponseDto } from './dto/responses/ai-assessment-response.dto';
import { SymptomIntakeResponseDto } from './dto/responses/symptom-intake-response.dto';

export function toSymptomIntakeResponse(intake: SymptomIntake): SymptomIntakeResponseDto {
  return {
    id: intake.id,
    encounterId: intake.encounterId,
    chiefComplaint: intake.chiefComplaint,
    severity: intake.severity,
    durationDays: intake.durationDays,
    symptoms: intake.symptoms,
    history: intake.history,
    currentMedication: intake.currentMedication,
    images: intake.images,
    submittedAt: intake.submittedAt.toISOString(),
  };
}

export function toAIAssessmentResponse(
  assessment: AIPreliminaryAssessment,
): AIAssessmentResponseDto {
  return {
    id: assessment.id,
    encounterId: assessment.encounterId,
    intakeId: assessment.intakeId,
    status: assessment.status,
    candidateConditions: assessment.candidateConditions as unknown as CandidateCondition[],
    redFlagTriggered: assessment.redFlagTriggered,
    redFlagUrgency: assessment.redFlagUrgency,
    redFlagReasons: assessment.redFlagReasons,
    suggestedSpecialty: assessment.suggestedSpecialty,
    suggestedNextActions: assessment.suggestedNextActions,
    modelVersion: assessment.modelVersion,
    missingDataHints: assessment.missingDataHints,
    supersededById: assessment.supersededById,
    generatedAt: assessment.generatedAt.toISOString(),
  };
}
