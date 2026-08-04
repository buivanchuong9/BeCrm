import {
  LesionMetricCategory,
  LesionMetricInterpretation,
  LesionMetricSource,
} from '@prisma/client';
import { ValidationAppError } from '../../core/errors/app-error';
import {
  CLINICAL_METRIC_CATALOG,
  interpretMetricChange,
  requireMetricDefinition,
} from './clinical-metric.catalog';

const EXPECTED_CODES = [
  'lesion-longest-diameter-mm',
  'lesion-short-axis-mm',
  'lesion-area-cm2',
  'lesion-count',
  'erythema-severity-0-4',
  'edema-papulation-severity-0-4',
  'scaling-severity-0-4',
  'exudation-crusting-severity-0-4',
  'excoriation-severity-0-4',
  'lichenification-severity-0-4',
  'itch-nrs-24h',
  'pain-nrs-24h',
  'burning-nrs-24h',
  'sleep-impact-nrs-7d',
  'prescribed-dose-count',
  'reported-taken-dose-count',
  'lesion-area-index',
  'erythema-index',
  'lesion-count-estimate',
  'new-lesion-region-detected',
  'ai-classification-confidence',
] as const;

const IMAGE_ANALYSIS_ONLY_CODES = [
  'lesion-area-index',
  'erythema-index',
  'lesion-count-estimate',
  'new-lesion-region-detected',
  'ai-classification-confidence',
] as const;

describe('clinical metric catalog', () => {
  it('rejects unsupported metric codes with the stable validation contract', () => {
    let thrown: unknown;

    try {
      requireMetricDefinition('browser-invented-ai-score');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ValidationAppError);
    expect(thrown).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: [
        {
          field: 'clinicalMetrics.code',
          code: 'UNSUPPORTED_CLINICAL_METRIC',
        },
      ],
    });
  });

  it('has the exact reviewed code set and internally valid boundaries', () => {
    expect([...CLINICAL_METRIC_CATALOG.keys()].sort()).toEqual([...EXPECTED_CODES].sort());
    expect(CLINICAL_METRIC_CATALOG.size).toBe(EXPECTED_CODES.length);

    for (const [code, definition] of CLINICAL_METRIC_CATALOG) {
      expect(definition.code).toBe(code);
      expect(definition.label.trim()).not.toBe('');
      expect(definition.unit.trim()).not.toBe('');
      expect(Number.isFinite(definition.minimum)).toBe(true);
      expect(Number.isFinite(definition.maximum)).toBe(true);
      expect(definition.minimum).toBeGreaterThanOrEqual(0);
      expect(definition.maximum).toBeGreaterThanOrEqual(definition.minimum);
      expect(definition.allowedSources.length).toBeGreaterThan(0);
      expect(new Set(definition.allowedSources).size).toBe(definition.allowedSources.length);
      // IMAGE_ANALYSIS-sourced codes are written only by an ImageAnalysisAdapter
      // onto a ComparisonAnalysis (comparison-analysis.service.ts) — never
      // accepted from CreateLesionObservationRequest, whose
      // validateObservationMetrics only allows PATIENT_REPORTED/
      // CLINICIAN_REPORTED. Every other code must stay observation-submittable
      // only, so a clinician/patient can never claim an image-analysis
      // provenance for a value they typed in by hand.
      if (definition.allowedSources.includes(LesionMetricSource.IMAGE_ANALYSIS)) {
        expect(IMAGE_ANALYSIS_ONLY_CODES).toContain(code);
        expect(definition.allowedSources).toEqual([LesionMetricSource.IMAGE_ANALYSIS]);
      } else {
        expect(IMAGE_ANALYSIS_ONLY_CODES).not.toContain(code);
      }
    }

    expect(requireMetricDefinition('itch-nrs-24h')).toMatchObject({
      category: LesionMetricCategory.SYMPTOM,
      minimum: 0,
      maximum: 10,
      unit: '{score}',
    });
    expect(requireMetricDefinition('erythema-severity-0-4')).toMatchObject({
      category: LesionMetricCategory.INFLAMMATION,
      minimum: 0,
      maximum: 4,
      methodRequired: true,
    });
    expect(requireMetricDefinition('lesion-longest-diameter-mm')).toMatchObject({
      category: LesionMetricCategory.MORPHOLOGY,
      minimum: 0,
      maximum: 1000,
      methodRequired: true,
    });
  });

  it.each([
    ['missing baseline', null, 4],
    ['missing current value', 4, null],
  ])('keeps the result indeterminate when %s', (_caseName, baseline, current) => {
    const definition = requireMetricDefinition('itch-nrs-24h');

    expect(interpretMetricChange(definition, baseline, current)).toEqual({
      interpretation: LesionMetricInterpretation.INDETERMINATE,
      policyId: null,
      policyVersion: null,
    });
  });

  it('does not infer recovery direction from a neutral morphology metric', () => {
    const definition = requireMetricDefinition('lesion-area-cm2');

    expect(interpretMetricChange(definition, 12.5, 4.25)).toEqual({
      interpretation: LesionMetricInterpretation.INDETERMINATE,
      policyId: null,
      policyVersion: null,
    });
  });

  it.each([
    ['lower symptom burden', 8, 3, LesionMetricInterpretation.IMPROVED],
    ['unchanged symptom burden', 5, 5, LesionMetricInterpretation.STABLE],
    ['higher symptom burden', 2, 7, LesionMetricInterpretation.WORSENED],
  ])(
    'interprets %s using the versioned lower-is-better policy',
    (_caseName, baseline, current, expected) => {
      const definition = requireMetricDefinition('pain-nrs-24h');

      expect(interpretMetricChange(definition, baseline, current)).toEqual({
        interpretation: expected,
        policyId: 'derma-clinical-direction',
        policyVersion: '1.0.0',
      });
    },
  );

  it('keeps patient-reported symptoms separate from clinician-measured morphology', () => {
    const symptom = requireMetricDefinition('itch-nrs-24h');
    const morphology = requireMetricDefinition('lesion-short-axis-mm');

    expect(symptom.allowedSources).toContain(LesionMetricSource.PATIENT_REPORTED);
    expect(symptom.allowedSources).toContain(LesionMetricSource.CLINICIAN_REPORTED);
    expect(morphology.allowedSources).not.toContain(LesionMetricSource.PATIENT_REPORTED);
    expect(morphology.allowedSources).toEqual(
      expect.arrayContaining([
        LesionMetricSource.CLINICIAN_REPORTED,
        LesionMetricSource.DEVICE,
        LesionMetricSource.IMPORTED,
      ]),
    );
  });
});
