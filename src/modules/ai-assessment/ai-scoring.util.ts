/**
 * Real-data-only symptom-intake rules. docs/api.md UNKNOWN-9: no real
 * dermatology-AI model or clinical scoring rubric is confirmed anywhere in
 * the source evidence this backend was modeled on, so this module no longer
 * fabricates a differential-diagnosis scorer (candidate conditions with a
 * confidence score) — see AiAssessmentService, which always returns an empty
 * candidateConditions list with an honest "no validated model" reason
 * instead. The red-flag thresholds and the "insufficient_data" rule below
 * ARE confirmed business rules (transcribed verbatim) and are real,
 * deterministic clinical triage logic, not a diagnostic model — safe to keep.
 */

export const SYMPTOM_KEYS = [
  'itching',
  'pain',
  'pus',
  'fever',
  'rapid_spreading',
  'bleeding',
  'scaling',
] as const;
export type SymptomKey = (typeof SYMPTOM_KEYS)[number];

export interface CandidateCondition {
  code: string;
  name: string;
  confidenceBand: 'low' | 'moderate' | 'high';
  confidenceScore: number;
  supportingEvidence: string[];
  conflictingEvidence: string[];
  rationale: string;
}

export function isDataSufficient(symptoms: SymptomKey[]): boolean {
  return symptoms.length > 0;
}

export interface RedFlagResult {
  triggered: boolean;
  urgency: 'routine' | 'urgent' | 'emergency';
  reasons: string[];
}

/** Confirmed verbatim from the source evidence's aiAssessmentService.ts
 * (docs/api.md section 24). Do not change these thresholds without updating
 * that section. */
export function evaluateRedFlag(severity: number, symptoms: SymptomKey[]): RedFlagResult {
  const has = (s: SymptomKey) => symptoms.includes(s);
  const reasons: string[] = [];

  if (severity >= 4 && (has('fever') || has('bleeding'))) {
    if (severity >= 4) reasons.push('Mức độ nghiêm trọng cao kèm sốt hoặc chảy máu');
    return { triggered: true, urgency: 'emergency', reasons };
  }
  if (severity >= 3 && has('rapid_spreading')) {
    reasons.push('Tổn thương lan nhanh');
    return { triggered: true, urgency: 'urgent', reasons };
  }
  if (severity >= 5) {
    reasons.push('Mức độ nghiêm trọng rất cao');
    return { triggered: true, urgency: 'urgent', reasons };
  }
  return { triggered: false, urgency: 'routine', reasons: [] };
}

/** No validated differential-diagnosis model exists. Real patients must never
 * see fabricated candidate conditions or a confidence score for one — see
 * UnavailableImageAnalysisAdapter in lesion-tracking for the equivalent,
 * already-established pattern (modelName: 'none', honest limitations). */
export const MODEL_VERSION = 'not-available';

export const NO_VALIDATED_MODEL_REASON =
  'Chưa có mô hình chẩn đoán phân biệt đã được thẩm định lâm sàng cho dữ liệu triệu chứng. Cần bác sĩ đánh giá thủ công.';
