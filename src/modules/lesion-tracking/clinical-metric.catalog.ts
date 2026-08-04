import {
  LesionMetricCategory,
  LesionMetricInterpretation,
  LesionMetricSource,
} from '@prisma/client';
import { ValidationAppError } from '../../core/errors/app-error';

export interface ClinicalMetricDefinition {
  code: string;
  label: string;
  category: LesionMetricCategory;
  unit: string;
  minimum: number;
  maximum: number;
  allowedSources: readonly LesionMetricSource[];
  interpretation: 'LOWER_IS_BETTER' | 'NEUTRAL';
  methodRequired?: boolean;
}

const symptomSources = [
  LesionMetricSource.PATIENT_REPORTED,
  LesionMetricSource.CLINICIAN_REPORTED,
] as const;

const clinicianSources = [
  LesionMetricSource.CLINICIAN_REPORTED,
  LesionMetricSource.DEVICE,
  LesionMetricSource.IMPORTED,
] as const;

const definitions: ClinicalMetricDefinition[] = [
  {
    code: 'lesion-longest-diameter-mm',
    label: 'Đường kính lớn nhất',
    category: LesionMetricCategory.MORPHOLOGY,
    unit: 'mm',
    minimum: 0,
    maximum: 1000,
    allowedSources: clinicianSources,
    interpretation: 'NEUTRAL',
    methodRequired: true,
  },
  {
    code: 'lesion-short-axis-mm',
    label: 'Đường kính vuông góc',
    category: LesionMetricCategory.MORPHOLOGY,
    unit: 'mm',
    minimum: 0,
    maximum: 1000,
    allowedSources: clinicianSources,
    interpretation: 'NEUTRAL',
    methodRequired: true,
  },
  {
    code: 'lesion-area-cm2',
    label: 'Diện tích tổn thương đã hiệu chuẩn',
    category: LesionMetricCategory.MORPHOLOGY,
    unit: 'cm2',
    minimum: 0,
    maximum: 50000,
    allowedSources: clinicianSources,
    interpretation: 'NEUTRAL',
    methodRequired: true,
  },
  {
    code: 'lesion-count',
    label: 'Số lượng tổn thương',
    category: LesionMetricCategory.MORPHOLOGY,
    unit: '{count}',
    minimum: 0,
    maximum: 10000,
    allowedSources: clinicianSources,
    interpretation: 'NEUTRAL',
  },
  {
    code: 'erythema-severity-0-4',
    label: 'Mức độ ban đỏ',
    category: LesionMetricCategory.INFLAMMATION,
    unit: '{score}',
    minimum: 0,
    maximum: 4,
    allowedSources: clinicianSources,
    interpretation: 'LOWER_IS_BETTER',
    methodRequired: true,
  },
  {
    code: 'edema-papulation-severity-0-4',
    label: 'Phù nề / sẩn',
    category: LesionMetricCategory.INFLAMMATION,
    unit: '{score}',
    minimum: 0,
    maximum: 4,
    allowedSources: clinicianSources,
    interpretation: 'LOWER_IS_BETTER',
    methodRequired: true,
  },
  {
    code: 'scaling-severity-0-4',
    label: 'Bong vảy',
    category: LesionMetricCategory.INFLAMMATION,
    unit: '{score}',
    minimum: 0,
    maximum: 4,
    allowedSources: clinicianSources,
    interpretation: 'LOWER_IS_BETTER',
    methodRequired: true,
  },
  {
    code: 'exudation-crusting-severity-0-4',
    label: 'Rỉ dịch / đóng mày',
    category: LesionMetricCategory.INFLAMMATION,
    unit: '{score}',
    minimum: 0,
    maximum: 4,
    allowedSources: clinicianSources,
    interpretation: 'LOWER_IS_BETTER',
    methodRequired: true,
  },
  {
    code: 'excoriation-severity-0-4',
    label: 'Trợt xước',
    category: LesionMetricCategory.INFLAMMATION,
    unit: '{score}',
    minimum: 0,
    maximum: 4,
    allowedSources: clinicianSources,
    interpretation: 'LOWER_IS_BETTER',
    methodRequired: true,
  },
  {
    code: 'lichenification-severity-0-4',
    label: 'Lichen hóa',
    category: LesionMetricCategory.INFLAMMATION,
    unit: '{score}',
    minimum: 0,
    maximum: 4,
    allowedSources: clinicianSources,
    interpretation: 'LOWER_IS_BETTER',
    methodRequired: true,
  },
  {
    code: 'itch-nrs-24h',
    label: 'Ngứa NRS (24 giờ)',
    category: LesionMetricCategory.SYMPTOM,
    unit: '{score}',
    minimum: 0,
    maximum: 10,
    allowedSources: symptomSources,
    interpretation: 'LOWER_IS_BETTER',
  },
  {
    code: 'pain-nrs-24h',
    label: 'Đau NRS (24 giờ)',
    category: LesionMetricCategory.SYMPTOM,
    unit: '{score}',
    minimum: 0,
    maximum: 10,
    allowedSources: symptomSources,
    interpretation: 'LOWER_IS_BETTER',
  },
  {
    code: 'burning-nrs-24h',
    label: 'Bỏng rát NRS (24 giờ)',
    category: LesionMetricCategory.SYMPTOM,
    unit: '{score}',
    minimum: 0,
    maximum: 10,
    allowedSources: symptomSources,
    interpretation: 'LOWER_IS_BETTER',
  },
  {
    code: 'sleep-impact-nrs-7d',
    label: 'Ảnh hưởng giấc ngủ NRS (7 ngày)',
    category: LesionMetricCategory.FUNCTION,
    unit: '{score}',
    minimum: 0,
    maximum: 10,
    allowedSources: symptomSources,
    interpretation: 'LOWER_IS_BETTER',
  },
  {
    code: 'prescribed-dose-count',
    label: 'Số liều được kê trong kỳ',
    category: LesionMetricCategory.TREATMENT,
    unit: '{dose}',
    minimum: 0,
    maximum: 10000,
    allowedSources: clinicianSources,
    interpretation: 'NEUTRAL',
    methodRequired: true,
  },
  {
    code: 'reported-taken-dose-count',
    label: 'Số liều người bệnh báo cáo đã dùng',
    category: LesionMetricCategory.TREATMENT,
    unit: '{dose}',
    minimum: 0,
    maximum: 10000,
    allowedSources: symptomSources,
    interpretation: 'NEUTRAL',
    methodRequired: true,
  },
  // Image-analysis-derived comparison metrics. These are never accepted from
  // CreateLesionObservationRequest (validateObservationMetrics only allows
  // PATIENT_REPORTED/CLINICIAN_REPORTED) — they are written directly by an
  // ImageAnalysisAdapter onto a ComparisonAnalysis. Registered here so
  // validateCorrections() can bound a clinician's corrected value.
  {
    code: 'lesion-area-index',
    label: 'Diện tích tổn thương (chỉ số so với mốc = 100%)',
    category: LesionMetricCategory.MORPHOLOGY,
    unit: '%',
    minimum: 0,
    maximum: 500,
    allowedSources: [LesionMetricSource.IMAGE_ANALYSIS],
    interpretation: 'LOWER_IS_BETTER',
  },
  {
    code: 'erythema-index',
    label: 'Mức ban đỏ (chỉ số so với mốc = 100%)',
    category: LesionMetricCategory.INFLAMMATION,
    unit: '%',
    minimum: 0,
    maximum: 500,
    allowedSources: [LesionMetricSource.IMAGE_ANALYSIS],
    interpretation: 'LOWER_IS_BETTER',
  },
  {
    code: 'lesion-count-estimate',
    label: 'Số vùng tổn thương phát hiện được trên ảnh',
    category: LesionMetricCategory.MORPHOLOGY,
    unit: '{count}',
    minimum: 0,
    maximum: 50,
    allowedSources: [LesionMetricSource.IMAGE_ANALYSIS],
    interpretation: 'LOWER_IS_BETTER',
  },
  {
    code: 'new-lesion-region-detected',
    label: 'Phát hiện vùng tổn thương mới',
    category: LesionMetricCategory.OTHER,
    unit: '{boolean}',
    minimum: 0,
    maximum: 1,
    allowedSources: [LesionMetricSource.IMAGE_ANALYSIS],
    interpretation: 'NEUTRAL',
  },
  {
    code: 'ai-classification-confidence',
    label: 'Độ tin cậy phân loại AI cho nhóm ban đầu',
    category: LesionMetricCategory.OTHER,
    unit: '%',
    minimum: 0,
    maximum: 100,
    allowedSources: [LesionMetricSource.IMAGE_ANALYSIS],
    // Confidence is not inherently "lower/higher is better" clinically — never
    // infer a direction from it the way MORPHOLOGY/INFLAMMATION indices do.
    interpretation: 'NEUTRAL',
  },
];

export const CLINICAL_METRIC_CATALOG = new Map(
  definitions.map((definition) => [definition.code, definition]),
);

export function requireMetricDefinition(code: string): ClinicalMetricDefinition {
  const definition = CLINICAL_METRIC_CATALOG.get(code);
  if (!definition) {
    throw new ValidationAppError([
      {
        field: 'clinicalMetrics.code',
        code: 'UNSUPPORTED_CLINICAL_METRIC',
        message: `Unsupported clinical metric code: ${code}.`,
      },
    ]);
  }
  return definition;
}

export function interpretMetricChange(
  definition: ClinicalMetricDefinition,
  baseline: number | null,
  current: number | null,
): {
  interpretation: LesionMetricInterpretation;
  policyId: string | null;
  policyVersion: string | null;
} {
  if (baseline === null || current === null || definition.interpretation === 'NEUTRAL') {
    return {
      interpretation: LesionMetricInterpretation.INDETERMINATE,
      policyId: null,
      policyVersion: null,
    };
  }
  if (baseline === current) {
    return {
      interpretation: LesionMetricInterpretation.STABLE,
      policyId: 'derma-clinical-direction',
      policyVersion: '1.0.0',
    };
  }
  return {
    interpretation:
      current < baseline
        ? LesionMetricInterpretation.IMPROVED
        : LesionMetricInterpretation.WORSENED,
    policyId: 'derma-clinical-direction',
    policyVersion: '1.0.0',
  };
}
