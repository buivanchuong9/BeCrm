import {
  AuditEvent,
  DermatologyAdverseEvent,
  Lesion,
  LesionMetricVerificationStatus,
  LesionTimelineEvent,
  Prisma,
} from '@prisma/client';
import { ComparisonRecord, ObservationRecord } from './lesion-tracking.repository';

export type ProtectedImageUrlMap = ReadonlyMap<string, string | null>;

const TIMELINE_TYPES = new Set([
  'OBSERVATION',
  'IMAGE',
  'TREATMENT',
  'SYMPTOM',
  'ANALYSIS',
  'CLINICIAN_REVIEW',
  'ADVERSE_EVENT',
  'RECAPTURE',
]);

const METRIC_SOURCES = new Set([
  'IMAGE_ANALYSIS',
  'PATIENT_REPORTED',
  'CLINICIAN_REPORTED',
  'DEVICE',
  'IMPORTED',
  'SYSTEM',
]);

const EVIDENCE_TYPES = new Set(['METRIC', 'OVERLAY', 'TIMELINE']);

function decimalToNumber(value: Prisma.Decimal | number | null): number | null {
  if (value === null) return null;
  const result = typeof value === 'number' ? value : value.toNumber();
  return Number.isFinite(result) ? result : null;
}

function requiredDecimalToNumber(value: Prisma.Decimal | number): number {
  const result = decimalToNumber(value);
  if (result === null) {
    throw new TypeError('A persisted clinical metric must be a finite number.');
  }
  return result;
}

function numericRecord(value: Prisma.JsonValue): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === 'number' && Number.isFinite(entry[1]),
    ),
  );
}

function jsonDisplay(value: Prisma.JsonValue | null): string | null {
  if (value === null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function mapRegistrationProvenance(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const {
    kind,
    dx,
    dy,
    score,
    phasePeakStrength,
    likelySameBodyRegion,
    likelySameLesion,
    requiresClinicianMaskReview,
  } = value as Record<string, unknown>;
  if (
    typeof kind !== 'string' ||
    typeof dx !== 'number' ||
    typeof dy !== 'number' ||
    typeof score !== 'number' ||
    typeof phasePeakStrength !== 'number' ||
    typeof likelySameBodyRegion !== 'number' ||
    typeof likelySameLesion !== 'number' ||
    typeof requiresClinicianMaskReview !== 'boolean'
  ) {
    return null;
  }
  return {
    kind,
    dx,
    dy,
    score,
    phasePeakStrength,
    likelySameBodyRegion,
    likelySameLesion,
    requiresClinicianMaskReview,
  };
}

function mapEvidence(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
    const id = entry.id;
    const text = entry.text;
    const type = entry.type;
    const targetId = entry.targetId;
    if (
      typeof id !== 'string' ||
      typeof text !== 'string' ||
      typeof type !== 'string' ||
      !EVIDENCE_TYPES.has(type) ||
      typeof targetId !== 'string'
    ) {
      return [];
    }
    return [{ id, text, type: type as 'METRIC' | 'OVERLAY' | 'TIMELINE', targetId }];
  });
}

export function mapLesion(lesion: Lesion) {
  return {
    id: lesion.id,
    patientId: lesion.patientId,
    code: lesion.code,
    title: lesion.title,
    bodyRegion: lesion.bodyRegion,
    laterality: lesion.laterality,
    diagnosis: lesion.diagnosis,
    diagnosisCode: lesion.diagnosisCode,
    firstObservedAt: lesion.firstObservedAt.toISOString(),
    status: lesion.status,
    createdBy: lesion.createdByNameSnap,
    createdAt: lesion.createdAt.toISOString(),
    updatedAt: lesion.updatedAt.toISOString(),
    currentAssessment: lesion.currentAssessment,
    reviewState: lesion.reviewState,
    clinicianName: lesion.responsibleClinicianNameSnap,
    clinicianId: lesion.responsibleClinicianId,
    currentTreatment: lesion.currentTreatment,
    clinicianSelectedBaselineId: lesion.clinicianSelectedBaselineId,
    suspectedAdverseEvent: lesion.suspectedAdverseEvent,
  };
}

export function mapObservation(
  observation: ObservationRecord,
  protectedUrls: ProtectedImageUrlMap,
) {
  const valuesByCode = new Map(
    observation.metrics.map((metric) => [metric.code, requiredDecimalToNumber(metric.value)]),
  );
  const score = (code: string): number | null => valuesByCode.get(code) ?? null;

  return {
    id: observation.id,
    lesionId: observation.lesionId,
    encounterId: observation.encounterId,
    capturedAt: observation.capturedAt.toISOString(),
    capturedBy: observation.capturedByNameSnap,
    imageAssets: observation.imageAssets.map((asset) => ({
      id: asset.id,
      patientId: asset.patientId,
      observationId: asset.observationId,
      originalAssetId: asset.originalAssetId,
      type: asset.type,
      protectedUrl: protectedUrls.get(asset.id) ?? null,
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
      fileSize: asset.fileSize,
      checksum: asset.checksum,
      maskProvenance: asset.maskProvenance,
      correctsAssetId: asset.correctsAssetId,
      capturedAt: asset.capturedAt.toISOString(),
      createdAt: asset.createdAt.toISOString(),
    })),
    patientReportedSymptoms: observation.patientReportedSymptoms,
    itchScore: score('itch-nrs-24h'),
    painScore: score('pain-nrs-24h'),
    burningScore: score('burning-nrs-24h'),
    sleepImpactScore: score('sleep-impact-nrs-7d'),
    clinicianNotes: observation.clinicianNotes,
    treatmentContext: observation.treatmentContext,
    clinicalMetrics: observation.metrics.map((metric) => ({
      code: metric.code,
      label: metric.label,
      category: metric.category,
      value: requiredDecimalToNumber(metric.value),
      unit: metric.unit,
      source: metric.source,
      measurementMethod: metric.measurementMethod,
      observedAt: metric.observedAt.toISOString(),
      confidence: decimalToNumber(metric.confidence),
      clinicianVerified: metric.verificationStatus === LesionMetricVerificationStatus.VERIFIED,
      verifiedBy: metric.verifiedById,
      verifiedAt: metric.verifiedAt?.toISOString() ?? null,
    })),
    imageQualityStatus: observation.imageQualityStatus,
    imageQualityReasons: observation.imageQualityReasons,
    status: observation.status,
    createdAt: observation.createdAt.toISOString(),
    updatedAt: observation.updatedAt.toISOString(),
    revision: observation.revision,
  };
}

export function mapComparison(comparison: ComparisonRecord) {
  const analysis = comparison.analysis;
  return {
    id: comparison.id,
    lesionId: comparison.lesionId,
    baselineObservationId: comparison.baselineObservationId,
    targetObservationId: comparison.targetObservationId,
    status: comparison.status,
    requestedBy: comparison.requestedByNameSnap,
    requestedAt: comparison.requestedAt.toISOString(),
    completedAt: comparison.completedAt?.toISOString() ?? null,
    failureReason: comparison.failureReason,
    analysisVersion: comparison.analysisVersion,
    idempotencyKey: comparison.idempotencyKey,
    analysis: analysis
      ? {
          id: analysis.id,
          comparisonSessionId: analysis.comparisonSessionId,
          analysisType: analysis.analysisType,
          modelName: analysis.modelName,
          modelVersion: analysis.modelVersion,
          algorithmVersion: analysis.algorithmVersion,
          confidence: decimalToNumber(analysis.confidence),
          generatedAt: analysis.generatedAt.toISOString(),
          assessment: analysis.assessment,
          visualChangeSummary: analysis.visualChangeSummary,
          limitations: analysis.limitations,
          isLegacyClassification: analysis.isLegacyClassification,
          quality: {
            comparabilityScore: analysis.comparabilityScore,
            sharpness: analysis.sharpness,
            lightingConsistency: analysis.lightingConsistency,
            angleConsistency: analysis.angleConsistency,
            scaleConsistency: analysis.scaleConsistency,
            occlusion: analysis.occlusion,
            registrationQuality: analysis.registrationQuality,
            comparisonDisposition: analysis.comparisonDisposition,
            policyVersion: analysis.qualityPolicyVersion,
            reasons: analysis.qualityReasons,
            registrationProvenance: mapRegistrationProvenance(analysis.registrationProvenance),
          },
          metrics: analysis.metrics.map((metric) => ({
            key: metric.key,
            label: metric.label,
            category: metric.category,
            baseline: decimalToNumber(metric.baseline),
            current: decimalToNumber(metric.current),
            delta: decimalToNumber(metric.delta),
            unit: metric.unit,
            source: metric.source,
            baselineSource: metric.baselineSource,
            currentSource: metric.currentSource,
            baselineObservedAt: metric.baselineObservedAt?.toISOString() ?? null,
            currentObservedAt: metric.currentObservedAt?.toISOString() ?? null,
            measurementMethod: metric.measurementMethod,
            missingReason: metric.missingReason,
            interpretation: metric.interpretation,
            interpretationPolicy:
              metric.interpretationPolicyId && metric.interpretationPolicyVersion
                ? {
                    id: metric.interpretationPolicyId,
                    version: metric.interpretationPolicyVersion,
                  }
                : null,
            confidence: decimalToNumber(metric.confidence),
            clinicianVerified: metric.clinicianVerified,
          })),
          evidence: mapEvidence(analysis.evidence),
        }
      : null,
    reviews: comparison.reviews.map((review) => ({
      id: review.id,
      comparisonSessionId: review.comparisonSessionId,
      reviewerId: review.reviewerId,
      reviewerName: review.reviewerNameSnap,
      decision: review.decision,
      clinicalAssessment: review.clinicalAssessment,
      correctedMetrics: numericRecord(review.correctedMetrics),
      comment: review.comment,
      imageLimitations: review.imageLimitations,
      recaptureRequested: review.recaptureRequested,
      reviewedAt: review.reviewedAt.toISOString(),
    })),
  };
}

export function mapTimelineEvent(event: LesionTimelineEvent) {
  return {
    id: event.id,
    lesionId: event.lesionId,
    occurredAt: event.occurredAt.toISOString(),
    type: TIMELINE_TYPES.has(event.type) ? event.type : 'OBSERVATION',
    title: event.title,
    summary: event.summary,
    source: METRIC_SOURCES.has(event.source) ? event.source : 'SYSTEM',
    relatedId: event.relatedId ?? undefined,
    warning: event.warning,
  };
}

export function mapAuditEntry(event: AuditEvent) {
  return {
    id: event.id,
    occurredAt: event.occurredAt.toISOString(),
    actorName: event.actorNameSnap ?? 'Hệ thống',
    action: event.action,
    previousValue: jsonDisplay(event.beforeRedacted),
    newValue: jsonDisplay(event.afterRedacted),
    reason: event.reason,
    source: event.sourceModule ?? 'lesion-tracking',
    // AuditEvent has requestId rather than a separate correlation id. The
    // immutable event id remains a stable trace handle for internal jobs.
    correlationId: event.requestId ?? event.id,
  };
}

export function mapAdverseEvent(event: DermatologyAdverseEvent) {
  return {
    id: event.id,
    patientId: event.patientId,
    lesionId: event.lesionId,
    suspectedMedicationIds: event.suspectedMedicationIds,
    onsetAt: event.onsetAt.toISOString(),
    symptoms: event.symptoms,
    severity: event.severity,
    urgencyLevel: event.urgencyLevel,
    causalityStatus: event.causalityStatus,
    clinicianStatus: event.clinicianStatus,
    status: event.status,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}
