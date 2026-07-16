/**
 * Deterministic placeholder scorer — docs/api.md UNKNOWN-9: no real
 * dermatology-AI model or clinical scoring rubric is confirmed anywhere in
 * the source evidence this backend was modeled on. The red-flag thresholds
 * and the "insufficient_data" rule below ARE confirmed business rules
 * (transcribed verbatim); the condition-matching weights are an explicit,
 * clearly-labeled interim stand-in — never present this as a real diagnostic
 * model to a clinician, and replace wholesale once Clinical/Product defines
 * a real algorithm or licenses a real model.
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

interface ConditionProfile {
  code: string;
  name: string;
  baseScore: number;
  triggeringSymptoms: SymptomKey[];
}

const CONDITION_LIBRARY: ConditionProfile[] = [
  {
    code: 'FOLL',
    name: 'Viêm nang lông',
    baseScore: 38,
    triggeringSymptoms: ['pus', 'pain', 'itching'],
  },
  { code: 'ACNE', name: 'Mụn trứng cá', baseScore: 42, triggeringSymptoms: ['pus', 'pain'] },
  {
    code: 'SEB',
    name: 'Viêm da tiết bã',
    baseScore: 35,
    triggeringSymptoms: ['itching', 'scaling'],
  },
  {
    code: 'ACD',
    name: 'Viêm da tiếp xúc dị ứng',
    baseScore: 33,
    triggeringSymptoms: ['itching', 'rapid_spreading'],
  },
  {
    code: 'TINEA',
    name: 'Nấm da',
    baseScore: 30,
    triggeringSymptoms: ['itching', 'scaling', 'rapid_spreading'],
  },
];

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

function scoreToBand(score: number): 'low' | 'moderate' | 'high' {
  if (score >= 72) return 'high';
  if (score >= 45) return 'moderate';
  return 'low';
}

export function scoreConditions(severity: number, symptoms: SymptomKey[]): CandidateCondition[] {
  const scored = CONDITION_LIBRARY.map((profile) => {
    const matched = profile.triggeringSymptoms.filter((s) => symptoms.includes(s));
    const score = Math.min(97, profile.baseScore + matched.length * 8 + severity * 3);
    return { profile, matched, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 3).map(({ profile, matched, score }) => ({
    code: profile.code,
    name: profile.name,
    confidenceBand: scoreToBand(score),
    confidenceScore: score,
    supportingEvidence: matched,
    conflictingEvidence: profile.triggeringSymptoms.filter((s) => !symptoms.includes(s)),
    rationale: `Khớp ${matched.length}/${profile.triggeringSymptoms.length} triệu chứng đặc trưng, mức độ nghiêm trọng ${severity}/5.`,
  }));
}

export const MODEL_VERSION = 'placeholder-scorer-v1';
