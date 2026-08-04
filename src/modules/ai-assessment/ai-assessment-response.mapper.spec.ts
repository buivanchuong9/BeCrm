import type { AIPreliminaryAssessment } from '@prisma/client';
import { toAIAssessmentResponse } from './ai-assessment-response.mapper';
import { MODEL_VERSION, NO_VALIDATED_MODEL_REASON } from './ai-scoring.util';

function assessmentRow(overrides: Partial<AIPreliminaryAssessment> = {}): AIPreliminaryAssessment {
  return {
    id: 'assessment-1',
    encounterId: 'encounter-1',
    intakeId: 'intake-1',
    status: 'completed',
    candidateConditions: [] as unknown as AIPreliminaryAssessment['candidateConditions'],
    redFlagTriggered: false,
    redFlagUrgency: null,
    redFlagReasons: [],
    suggestedSpecialty: 'Da liễu',
    suggestedNextActions: [],
    modelVersion: MODEL_VERSION,
    missingDataHints: [],
    supersededById: null,
    generatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as AIPreliminaryAssessment;
}

describe('toAIAssessmentResponse — real-data-only symptom assessment', () => {
  it('never fabricates a differential-diagnosis model version', () => {
    expect(MODEL_VERSION).toBe('not-available');
  });

  it('surfaces an honest unavailable reason when intake data was sufficient', () => {
    const response = toAIAssessmentResponse(assessmentRow({ status: 'completed' }));
    expect(response.candidateConditions).toEqual([]);
    expect(response.candidateConditionsUnavailableReason).toBe(NO_VALIDATED_MODEL_REASON);
    expect(response.modelVersion).toBe('not-available');
  });

  it('does not claim "no validated model" when intake data was insufficient — a different, real reason applies', () => {
    const response = toAIAssessmentResponse(assessmentRow({ status: 'insufficient_data' }));
    expect(response.candidateConditionsUnavailableReason).toBeNull();
  });

  it('does not claim "no validated model" for a failed assessment', () => {
    const response = toAIAssessmentResponse(assessmentRow({ status: 'failed' }));
    expect(response.candidateConditionsUnavailableReason).toBeNull();
  });
});
