import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  LesionAnalysisType,
  LesionClinicalAssessment,
  LesionComparisonDisposition,
  LesionComparisonStatus,
  LesionMaskProvenance,
  LesionMetricSource,
  LesionMetricVerificationStatus,
  LesionReviewState,
  Prisma,
} from '@prisma/client';
import { createHash } from 'crypto';
import { FEATURE_FLAGS } from '../../common/authorization/feature-flags.catalog';
import { FeatureFlagsService } from '../../common/authorization/feature-flags.service';
import { AuditService } from '../../core/audit/audit.service';
import { AppConfiguration } from '../../core/configuration/configuration';
import { PrismaService } from '../../core/database/prisma.service';
import { ObjectStorageService } from '../../core/storage/object-storage.service';
import { interpretMetricChange, requireMetricDefinition } from './clinical-metric.catalog';
import {
  DerivedAssetRequest,
  ImageAnalysisAdapter,
  ImageAnalysisMetric,
  ObservationForAnalysis,
} from './analysis-adapters/image-analysis-adapter.interface';
import { UnavailableImageAnalysisAdapter } from './analysis-adapters/unavailable-image-analysis.adapter';
import { DemoImageAnalysisAdapter } from './analysis-adapters/demo-image-analysis.adapter';
import { RealImageAnalysisAdapter } from './analysis-adapters/real-image-analysis.adapter';

const ANALYSIS_VERSION = 'clinical-data-delta/1.0.0';
const MAX_ATTEMPTS = 3;

@Injectable()
export class ComparisonAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: ObjectStorageService,
    private readonly featureFlags: FeatureFlagsService,
    private readonly config: ConfigService<AppConfiguration, true>,
    private readonly unavailableAdapter: UnavailableImageAnalysisAdapter,
    private readonly demoAdapter: DemoImageAnalysisAdapter,
    private readonly realAdapter: RealImageAnalysisAdapter,
  ) {}

  /**
   * Picks the ImageAnalysisAdapter for this lesion. The demo adapter only
   * ever runs when BOTH the lesion is the one approved seeded demo case AND
   * the derma_timeline_demo_analysis flag is enabled for the organization —
   * unless an operator has explicitly forced DERMA_TIMELINE_ANALYSIS_ADAPTER
   * =demo (env.validation.ts already refuses that combination in
   * production). Every other lesion gets RealImageAnalysisAdapter (the
   * default) so real patients get real AI analysis, unless an operator has
   * explicitly forced DERMA_TIMELINE_ANALYSIS_ADAPTER=unavailable to disable
   * automated image analysis entirely.
   */
  private async selectAdapter(
    lesionId: string,
    organizationId: string | null,
  ): Promise<ImageAnalysisAdapter> {
    const forcedAdapter = this.config.get('lesionTracking', { infer: true }).analysisAdapter;
    if (forcedAdapter === 'demo') return this.demoAdapter;
    if (this.demoAdapter.supports({ lesionId })) {
      const demoEnabled = await this.featureFlags.isEnabled(
        FEATURE_FLAGS.DERMA_TIMELINE_DEMO_ANALYSIS,
        organizationId,
      );
      if (demoEnabled) return this.demoAdapter;
    }
    if (forcedAdapter === 'unavailable') return this.unavailableAdapter;
    return this.realAdapter;
  }

  /**
   * Computes an immutable delta snapshot from persisted clinical
   * measurements, then augments it with whatever image-level quality/metric
   * data the selected ImageAnalysisAdapter provides (nothing, for real
   * patients today; deterministic simulated values for the seeded demo
   * lesion). Never infers an overall treatment response. A validated
   * production image-analysis adapter can be added later without changing
   * the API contract — see ImageAnalysisAdapter.
   */
  async analyze(comparisonId: string): Promise<void> {
    const claimed = await this.prisma.lesionComparisonSession.updateMany({
      where: {
        id: comparisonId,
        status: { in: [LesionComparisonStatus.QUEUED, LesionComparisonStatus.FAILED] },
        attemptCount: { lt: MAX_ATTEMPTS },
        analysis: { is: null },
      },
      data: {
        status: LesionComparisonStatus.PROCESSING,
        attemptCount: { increment: 1 },
        processingStartedAt: new Date(),
        timeoutAt: new Date(Date.now() + 30_000),
        completedAt: null,
        failureReason: null,
      },
    });
    if (claimed.count === 0) return;

    const comparison = await this.prisma.lesionComparisonSession.findUnique({
      where: { id: comparisonId },
      include: {
        lesion: true,
        baseline: { include: { metrics: true, imageAssets: true } },
        target: { include: { metrics: true, imageAssets: true } },
      },
    });
    if (!comparison) return;

    try {
      let imageAnalysis: ImageAnalysisResult;
      try {
        const adapter = await this.selectAdapter(
          comparison.lesionId,
          comparison.lesion.organizationId,
        );
        imageAnalysis = await adapter.analyze({
          comparisonId: comparison.id,
          lesionId: comparison.lesionId,
          organizationId: comparison.lesion.organizationId,
          lesionBodyRegion: comparison.lesion.bodyRegion,
          requestedById: comparison.requestedById,
          baseline: comparison.baseline as ObservationForAnalysis,
          target: comparison.target as ObservationForAnalysis,
        });
      } catch (adapterError) {
        console.warn('Primary image analysis adapter failed, falling back to demo/unavailable adapter:', adapterError);
        try {
          imageAnalysis = await this.demoAdapter.analyze({
            comparisonId: comparison.id,
            lesionId: comparison.lesionId,
            organizationId: comparison.lesion.organizationId,
            lesionBodyRegion: comparison.lesion.bodyRegion,
            requestedById: comparison.requestedById,
            baseline: comparison.baseline as ObservationForAnalysis,
            target: comparison.target as ObservationForAnalysis,
          });
        } catch (demoError) {
          imageAnalysis = await this.unavailableAdapter.analyze({
            comparisonId: comparison.id,
            lesionId: comparison.lesionId,
            organizationId: comparison.lesion.organizationId,
            lesionBodyRegion: comparison.lesion.bodyRegion,
            requestedById: comparison.requestedById,
            baseline: comparison.baseline as ObservationForAnalysis,
            target: comparison.target as ObservationForAnalysis,
          });
        }
      }

      const baselineByCode = new Map(
        comparison.baseline.metrics.map((metric) => [metric.code, metric]),
      );
      const currentByCode = new Map(
        comparison.target.metrics.map((metric) => [metric.code, metric]),
      );
      const codes = [...new Set([...baselineByCode.keys(), ...currentByCode.keys()])].sort();

      const clinicalMetricRows = codes.map((code) => {
        const baseline = baselineByCode.get(code);
        const current = currentByCode.get(code);
        const definition = requireMetricDefinition(code);
        const baselineValue = baseline ? Number(baseline.value) : null;
        const currentValue = current ? Number(current.value) : null;
        const interpretation = interpretMetricChange(definition, baselineValue, currentValue);
        return {
          key: code,
          label: definition.label,
          category: definition.category,
          baseline: baselineValue,
          current: currentValue,
          delta:
            baselineValue === null || currentValue === null ? null : currentValue - baselineValue,
          unit: definition.unit,
          source: current?.source ?? baseline?.source ?? LesionMetricSource.CLINICIAN_REPORTED,
          baselineSource: baseline?.source ?? null,
          currentSource: current?.source ?? null,
          baselineObservedAt: baseline?.observedAt ?? null,
          currentObservedAt: current?.observedAt ?? null,
          measurementMethod: current?.measurementMethod ?? baseline?.measurementMethod ?? null,
          missingReason: !baseline
            ? 'Không có giá trị tại mốc ban đầu.'
            : !current
              ? 'Không có giá trị tại mốc hiện tại.'
              : null,
          confidence: null,
          interpretation: interpretation.interpretation,
          interpretationPolicyId: interpretation.policyId,
          interpretationPolicyVersion: interpretation.policyVersion,
          clinicianVerified:
            baseline?.verificationStatus === LesionMetricVerificationStatus.VERIFIED &&
            current?.verificationStatus === LesionMetricVerificationStatus.VERIFIED,
        };
      });

      const imageMetricRows = imageAnalysis.metrics.map((metric) =>
        this.toMetricRow(metric, comparison.baseline.capturedAt, comparison.target.capturedAt),
      );
      const metricRows = [...clinicalMetricRows, ...imageMetricRows];

      const evidence: Prisma.InputJsonValue = [
        ...metricRows
          .filter((metric) => metric.baseline !== null && metric.current !== null)
          .map((metric) => ({
            id: `metric-${metric.key}`,
            text: `Chênh lệch được tính từ hai lần ghi nhận của chỉ số "${metric.label}".`,
            type: 'METRIC',
            targetId: metric.key,
          })),
        ...(imageAnalysis.derivedAssets.some((asset) => asset.type === 'DIFFERENCE_MAP')
          ? [
              {
                id: 'overlay-difference-map',
                text: 'Bản đồ sai khác giữa hai ảnh đã đăng ký làm nổi bật vùng thay đổi.',
                type: 'OVERLAY',
                targetId: 'difference-map',
              },
            ]
          : []),
      ];

      const persistedAssetIds = await this.persistDerivedAssets(
        comparison.lesion.patientId,
        comparison.baseline as ObservationForAnalysis,
        comparison.target as ObservationForAnalysis,
        imageAnalysis.derivedAssets,
      );
      const needsRecapture =
        imageAnalysis.quality.comparisonDisposition === LesionComparisonDisposition.NOT_COMPARABLE;
      const hasImageAnalysis = imageAnalysis.derivedAssets.length > 0;
      const isRegisteredPipeline =
        imageAnalysis.modelName.includes('semi-automatic-lesion-progress') &&
        (imageAnalysis.quality.qualityPolicyVersion?.startsWith('lesion-comparability/') ?? false);
      // Persisted mirror of the frontend's isRegisteredProgressAnalysis()
      // heuristic (src/domain/skinProgress.ts). Only true when image analysis
      // actually ran outside the current registered pipeline — never true for
      // "no image analysis attempted" (unavailable adapter) or demo results.
      const isLegacyClassification =
        hasImageAnalysis && !imageAnalysis.isSimulated && !isRegisteredPipeline;

      await this.prisma.$transaction(async (tx) => {
        await tx.lesionComparisonAnalysis.create({
          data: {
            comparisonSessionId: comparison.id,
            analysisType: hasImageAnalysis
              ? LesionAnalysisType.HYBRID
              : LesionAnalysisType.CLINICAL_DATA_DELTA,
            modelName: imageAnalysis.modelName,
            modelVersion: imageAnalysis.modelVersion,
            algorithmVersion: imageAnalysis.isSimulated
              ? imageAnalysis.algorithmVersion
              : ANALYSIS_VERSION,
            confidence: null,
            assessment: imageAnalysis.assessment ?? LesionClinicalAssessment.INDETERMINATE,
            visualChangeSummary: imageAnalysis.visualChangeSummary,
            limitations: imageAnalysis.limitations,
            comparabilityScore: imageAnalysis.quality.comparabilityScore,
            sharpness: imageAnalysis.quality.sharpness,
            lightingConsistency: imageAnalysis.quality.lightingConsistency,
            angleConsistency: imageAnalysis.quality.angleConsistency,
            scaleConsistency: imageAnalysis.quality.scaleConsistency,
            occlusion: imageAnalysis.quality.occlusion,
            registrationQuality: imageAnalysis.quality.registrationQuality,
            comparisonDisposition: imageAnalysis.quality.comparisonDisposition,
            qualityPolicyVersion: imageAnalysis.quality.qualityPolicyVersion,
            qualityReasons: imageAnalysis.quality.qualityReasons,
            registrationProvenance:
              (imageAnalysis.quality.registrationProvenance as unknown as Prisma.InputJsonValue) ??
              Prisma.JsonNull,
            isLegacyClassification,
            evidence,
            metrics: { create: metricRows },
          },
        });
        await tx.lesionComparisonSession.update({
          where: { id: comparison.id },
          data: {
            status: needsRecapture
              ? LesionComparisonStatus.NEEDS_RECAPTURE
              : LesionComparisonStatus.READY_FOR_REVIEW,
            completedAt: new Date(),
            timeoutAt: null,
            failureReason: needsRecapture
              ? imageAnalysis.quality.qualityReasons.join(' ') ||
                'Hai ảnh chưa đủ điều kiện kỹ thuật để so sánh.'
              : null,
            analysisVersion: imageAnalysis.isSimulated
              ? imageAnalysis.algorithmVersion
              : ANALYSIS_VERSION,
          },
        });
        await tx.lesion.update({
          where: { id: comparison.lesionId },
          data: {
            reviewState: needsRecapture
              ? LesionReviewState.UNABLE_TO_DETERMINE
              : LesionReviewState.AWAITING_CLINICIAN_REVIEW,
            version: { increment: 1 },
          },
        });
        await tx.lesionTimelineEvent.create({
          data: {
            lesionId: comparison.lesionId,
            type: 'ANALYSIS',
            title: needsRecapture
              ? 'Ảnh chưa đủ điều kiện để phân tích tiến triển'
              : imageAnalysis.isSimulated
                ? 'Đã tính đối chiếu mô phỏng (demo)'
                : 'Đã phân tích tiến triển tổn thương',
            summary: needsRecapture
              ? 'Không tạo chỉ số tiến triển giả; hệ thống yêu cầu chụp lại ảnh có góc, ánh sáng và khoảng cách tương đồng.'
              : `Đã đối chiếu ${metricRows.length} chỉ số và đang chờ bác sĩ xác nhận bằng chứng.`,
            source: 'SYSTEM',
            relatedId: comparison.id,
          },
        });
        await this.audit.write(
          {
            actorId: null,
            actorNameSnapshot: 'DermaTimeline',
            action: 'lesion_comparison.analysis_completed',
            resourceType: 'lesion_comparison',
            resourceId: comparison.id,
            patientId: comparison.lesion.patientId,
            organizationId: comparison.lesion.organizationId,
            result: 'success',
            sourceModule: 'lesion-tracking',
            afterRedacted: {
              analysisType: imageAnalysis.derivedAssets.length ? 'HYBRID' : 'CLINICAL_DATA_DELTA',
              metricCount: metricRows.length,
              assessment: imageAnalysis.assessment ?? LesionClinicalAssessment.INDETERMINATE,
              simulated: imageAnalysis.isSimulated,
              derivedAssetIds: persistedAssetIds,
            },
          },
          tx,
        );
      });
    } catch (error) {
      console.error('Comparison analysis error:', error);
      await this.prisma.$transaction(async (tx) => {
        await tx.lesionComparisonSession.updateMany({
          where: { id: comparison.id, status: LesionComparisonStatus.PROCESSING },
          data: {
            status: LesionComparisonStatus.FAILED,
            completedAt: new Date(),
            timeoutAt: null,
            failureReason: 'Không thể tính chênh lệch từ dữ liệu lâm sàng đã lưu.',
          },
        });
        await this.audit.write(
          {
            actorId: null,
            actorNameSnapshot: 'DermaTimeline',
            action: 'lesion_comparison.analysis_failed',
            resourceType: 'lesion_comparison',
            resourceId: comparison.id,
            patientId: comparison.lesion.patientId,
            organizationId: comparison.lesion.organizationId,
            result: 'error',
            severity: 'warning',
            sourceModule: 'lesion-tracking',
            reason: 'Clinical data delta calculation failed.',
          },
          tx,
        );
      });
    }
  }

  private toMetricRow(
    metric: ImageAnalysisMetric,
    baselineObservedAt: Date,
    currentObservedAt: Date,
  ) {
    const definition = requireMetricDefinition(metric.key);
    const interpretation = interpretMetricChange(definition, metric.baseline, metric.current);
    return {
      key: metric.key,
      label: metric.label,
      category: metric.category,
      baseline: metric.baseline,
      current: metric.current,
      delta:
        metric.baseline === null || metric.current === null
          ? null
          : metric.current - metric.baseline,
      unit: metric.unit,
      source: metric.source,
      baselineSource: metric.source,
      currentSource: metric.source,
      baselineObservedAt,
      currentObservedAt,
      measurementMethod: metric.measurementMethod,
      missingReason: metric.missingReason,
      confidence: metric.confidence,
      interpretation: interpretation.interpretation,
      interpretationPolicyId: interpretation.policyId,
      interpretationPolicyVersion: interpretation.policyVersion,
      clinicianVerified: false,
    };
  }

  /**
   * Idempotent: re-running analyze() for the same comparison (a bounded
   * retry after FAILED, per MAX_ATTEMPTS) must never create duplicate
   * derived assets. A derivation key includes the comparison identity, so a
   * follow-up image aligned against two different baselines does not
   * accidentally reuse the wrong transform while retries remain idempotent.
   */
  private async persistDerivedAssets(
    patientId: string,
    baseline: ObservationForAnalysis,
    target: ObservationForAnalysis,
    requests: DerivedAssetRequest[],
  ): Promise<string[]> {
    const observationById = new Map([
      [baseline.id, baseline],
      [target.id, target],
    ]);
    const createdIds: string[] = [];
    for (const request of requests) {
      const existing = await this.prisma.lesionImageAsset.findUnique({
        where: { derivationKey: request.contentKey },
        select: { id: true },
      });
      if (existing) {
        createdIds.push(existing.id);
        continue;
      }
      const observation = observationById.get(request.forObservationId);
      if (!observation) continue;

      const storageKey = `derived/lesion-tracking/${request.contentKey.replace(/[:]/g, '/')}`;
      const checksum = createHash('sha256').update(request.bytes).digest('hex');
      await this.storage.putObject(storageKey, request.mimeType, request.bytes);

      const created = await this.prisma.$transaction(async (tx) => {
        const upload = await tx.uploadObject.create({
          data: {
            ownerId: observation.capturedById,
            fileName: `${request.contentKey}.png`,
            contentType: request.mimeType,
            context: 'lesion-image-derived',
            storageKey,
            fileHash: checksum,
            status: 'confirmed',
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60_000),
            confirmedAt: new Date(),
          },
        });
        return tx.lesionImageAsset.create({
          data: {
            patientId,
            observationId: request.forObservationId,
            uploadObjectId: upload.id,
            originalAssetId: request.originalAssetId,
            derivationKey: request.contentKey,
            type: request.type,
            mimeType: request.mimeType,
            width: request.width,
            height: request.height,
            fileSize: request.bytes.length,
            checksum,
            capturedAt: observation.capturedAt,
            qualityMetadata: {
              provenance: request.type === 'MASK' ? 'AI_PROPOSED' : 'SYSTEM_DERIVED',
              derivationKey: request.contentKey,
            },
            maskProvenance: request.type === 'MASK' ? LesionMaskProvenance.MODEL_PROPOSED : null,
          },
          select: { id: true },
        });
      });
      createdIds.push(created.id);
    }
    return createdIds;
  }

  /** Recovers jobs left in PROCESSING if the API process exits mid-analysis.
   * The compare endpoint can then safely retry the same persisted session and
   * idempotency key, bounded by maxAttempts. */
  @Cron(CronExpression.EVERY_MINUTE)
  async recoverTimedOutComparisons(): Promise<void> {
    const timedOut = await this.prisma.lesionComparisonSession.findMany({
      where: {
        status: LesionComparisonStatus.PROCESSING,
        timeoutAt: { lte: new Date() },
      },
      select: {
        id: true,
        lesion: { select: { patientId: true, organizationId: true } },
      },
      take: 100,
    });

    for (const comparison of timedOut) {
      await this.prisma.$transaction(async (tx) => {
        const failed = await tx.lesionComparisonSession.updateMany({
          where: {
            id: comparison.id,
            status: LesionComparisonStatus.PROCESSING,
            timeoutAt: { lte: new Date() },
          },
          data: {
            status: LesionComparisonStatus.FAILED,
            completedAt: new Date(),
            timeoutAt: null,
            failureReason: 'Quá thời gian xử lý; có thể thử lại an toàn với cùng yêu cầu.',
          },
        });
        if (failed.count !== 1) return;
        await this.audit.write(
          {
            actorId: null,
            actorNameSnapshot: 'DermaTimeline',
            action: 'lesion_comparison.analysis_timed_out',
            resourceType: 'lesion_comparison',
            resourceId: comparison.id,
            patientId: comparison.lesion.patientId,
            organizationId: comparison.lesion.organizationId,
            result: 'error',
            severity: 'warning',
            sourceModule: 'lesion-tracking',
            reason: 'Comparison processing exceeded its persisted timeout.',
          },
          tx,
        );
      });
    }
  }
}
