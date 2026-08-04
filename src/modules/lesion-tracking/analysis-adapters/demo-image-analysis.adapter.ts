import { Injectable } from '@nestjs/common';
import {
  LesionComparisonDisposition,
  LesionMetricSource,
  LesionRegistrationQuality,
} from '@prisma/client';
import {
  DerivedAssetRequest,
  ImageAnalysisAdapter,
  ImageAnalysisContext,
  ImageAnalysisResult,
  ObservationForAnalysis,
} from './image-analysis-adapter.interface';
import {
  DEMO_ALGORITHM_VERSION,
  DEMO_BASELINE_LESION_RADIUS,
  DEMO_IMAGE_SIZE,
  DEMO_LESION_ID,
  DEMO_MODEL_NAME,
  DEMO_MODEL_VERSION,
  DEMO_SIMULATED_DISCLAIMER,
  DEMO_TARGET_LESION_RADIUS,
  DEMO_THUMBNAIL_SIZE,
} from './demo-seed.constants';
import { differenceHeatmap, lesionMask, lesionPhoto, thumbnailOf } from './png-fixture';

function originalAssetOf(observation: ObservationForAnalysis) {
  const original = observation.imageAssets.find((asset) => asset.type === 'ORIGINAL');
  if (!original) {
    throw new Error(
      `Demo comparison references observation ${observation.id} with no ORIGINAL image asset.`,
    );
  }
  return original;
}

/**
 * Deterministic image-analysis adapter for the single approved seeded demo
 * lesion (see demo-seed.constants.ts). Every number and image byte produced
 * here is a pure function of fixed constants — no Math.random(), no
 * timestamps — so the same seeded comparison always yields the same
 * ComparisonAnalysis and the same derived-asset bytes.
 *
 * supports() is the only gate this class applies on its own; the caller
 * (ComparisonAnalysisService) additionally requires the
 * derma_timeline_demo_analysis feature flag (or an explicit
 * DERMA_TIMELINE_ANALYSIS_ADAPTER=demo override) before selecting this
 * adapter at all — see comparison-analysis.service.ts#selectAdapter. This
 * adapter must never be reachable for a real patient's lesion.
 */
@Injectable()
export class DemoImageAnalysisAdapter implements ImageAnalysisAdapter {
  readonly name = 'demo';

  supports(params: { lesionId: string }): boolean {
    return params.lesionId === DEMO_LESION_ID;
  }

  async analyze(context: ImageAnalysisContext): Promise<ImageAnalysisResult> {
    const baselineOriginal = originalAssetOf(context.baseline);
    const targetOriginal = originalAssetOf(context.target);

    const baselinePhoto = () =>
      lesionPhoto(DEMO_IMAGE_SIZE, DEMO_IMAGE_SIZE, DEMO_BASELINE_LESION_RADIUS);
    const targetPhoto = () =>
      lesionPhoto(DEMO_IMAGE_SIZE, DEMO_IMAGE_SIZE, DEMO_TARGET_LESION_RADIUS);
    const baselinePixelAt = (x: number, y: number) => {
      const cx = DEMO_IMAGE_SIZE / 2;
      const cy = DEMO_IMAGE_SIZE / 2;
      const inLesion = Math.hypot(x - cx, y - cy) <= DEMO_BASELINE_LESION_RADIUS;
      return inLesion ? ([176, 60, 52] as const) : ([224, 172, 144] as const);
    };
    const targetPixelAt = (x: number, y: number) => {
      const cx = DEMO_IMAGE_SIZE / 2;
      const cy = DEMO_IMAGE_SIZE / 2;
      const inLesion = Math.hypot(x - cx, y - cy) <= DEMO_TARGET_LESION_RADIUS;
      return inLesion ? ([176, 60, 52] as const) : ([224, 172, 144] as const);
    };

    const derivedAssets: DerivedAssetRequest[] = [
      {
        forObservationId: context.baseline.id,
        originalAssetId: baselineOriginal.id,
        type: 'ALIGNED',
        mimeType: 'image/png',
        width: DEMO_IMAGE_SIZE,
        height: DEMO_IMAGE_SIZE,
        bytes: baselinePhoto(),
        contentKey: `${context.comparisonId}:${context.baseline.id}:ALIGNED`,
      },
      {
        forObservationId: context.target.id,
        originalAssetId: targetOriginal.id,
        type: 'ALIGNED',
        mimeType: 'image/png',
        width: DEMO_IMAGE_SIZE,
        height: DEMO_IMAGE_SIZE,
        bytes: targetPhoto(),
        contentKey: `${context.comparisonId}:${context.target.id}:ALIGNED`,
      },
      {
        forObservationId: context.baseline.id,
        originalAssetId: baselineOriginal.id,
        type: 'MASK',
        mimeType: 'image/png',
        width: DEMO_IMAGE_SIZE,
        height: DEMO_IMAGE_SIZE,
        bytes: lesionMask(DEMO_IMAGE_SIZE, DEMO_IMAGE_SIZE, DEMO_BASELINE_LESION_RADIUS),
        contentKey: `${context.comparisonId}:${context.baseline.id}:MASK`,
      },
      {
        forObservationId: context.target.id,
        originalAssetId: targetOriginal.id,
        type: 'MASK',
        mimeType: 'image/png',
        width: DEMO_IMAGE_SIZE,
        height: DEMO_IMAGE_SIZE,
        bytes: lesionMask(DEMO_IMAGE_SIZE, DEMO_IMAGE_SIZE, DEMO_TARGET_LESION_RADIUS),
        contentKey: `${context.comparisonId}:${context.target.id}:MASK`,
      },
      {
        forObservationId: context.target.id,
        originalAssetId: targetOriginal.id,
        type: 'DIFFERENCE_MAP',
        mimeType: 'image/png',
        width: DEMO_IMAGE_SIZE,
        height: DEMO_IMAGE_SIZE,
        bytes: differenceHeatmap(
          DEMO_IMAGE_SIZE,
          DEMO_IMAGE_SIZE,
          DEMO_BASELINE_LESION_RADIUS,
          DEMO_TARGET_LESION_RADIUS,
        ),
        contentKey: `${context.comparisonId}:${context.target.id}:DIFFERENCE_MAP`,
      },
      {
        forObservationId: context.baseline.id,
        originalAssetId: baselineOriginal.id,
        type: 'THUMBNAIL',
        mimeType: 'image/png',
        width: DEMO_THUMBNAIL_SIZE,
        height: DEMO_THUMBNAIL_SIZE,
        bytes: thumbnailOf(DEMO_IMAGE_SIZE, DEMO_IMAGE_SIZE, DEMO_THUMBNAIL_SIZE, baselinePixelAt),
        contentKey: `${context.comparisonId}:${context.baseline.id}:THUMBNAIL`,
      },
      {
        forObservationId: context.target.id,
        originalAssetId: targetOriginal.id,
        type: 'THUMBNAIL',
        mimeType: 'image/png',
        width: DEMO_THUMBNAIL_SIZE,
        height: DEMO_THUMBNAIL_SIZE,
        bytes: thumbnailOf(DEMO_IMAGE_SIZE, DEMO_IMAGE_SIZE, DEMO_THUMBNAIL_SIZE, targetPixelAt),
        contentKey: `${context.comparisonId}:${context.target.id}:THUMBNAIL`,
      },
    ];

    return {
      isSimulated: true,
      modelName: DEMO_MODEL_NAME,
      modelVersion: DEMO_MODEL_VERSION,
      algorithmVersion: DEMO_ALGORITHM_VERSION,
      visualChangeSummary:
        'Vùng ban đỏ giảm rõ rệt so với mốc ban đầu; không phát hiện vùng tổn thương mới. ' +
        DEMO_SIMULATED_DISCLAIMER,
      limitations: [
        DEMO_SIMULATED_DISCLAIMER,
        'Ảnh và số liệu là dữ liệu mô phỏng cố định, không đến từ một mô hình thị giác máy tính thật.',
      ],
      quality: {
        comparabilityScore: 92,
        sharpness: 94,
        lightingConsistency: 89,
        angleConsistency: 91,
        scaleConsistency: 90,
        occlusion: 2,
        registrationQuality: LesionRegistrationQuality.GOOD,
        comparisonDisposition: LesionComparisonDisposition.COMPARABLE,
        qualityPolicyVersion: 'demo-quality-policy/1.0.0',
        qualityReasons: [],
        registrationProvenance: null,
      },
      derivedAssets,
      metrics: [
        {
          key: 'lesion-area-index',
          label: 'Diện tích tổn thương (chỉ số so với mốc = 100%)',
          category: 'MORPHOLOGY' as const,
          baseline: 100,
          current: 76.6,
          unit: '%',
          source: LesionMetricSource.IMAGE_ANALYSIS,
          confidence: 0.82,
          measurementMethod: 'Ước tính diện tích vùng phân đoạn (demo, không phải AI thật)',
          missingReason: null,
        },
        {
          key: 'erythema-index',
          label: 'Mức ban đỏ (chỉ số so với mốc = 100%)',
          category: 'INFLAMMATION' as const,
          baseline: 100,
          current: 83.2,
          unit: '%',
          source: LesionMetricSource.IMAGE_ANALYSIS,
          confidence: 0.78,
          measurementMethod: 'Ước tính cường độ màu vùng ban đỏ (demo, không phải AI thật)',
          missingReason: null,
        },
        {
          key: 'lesion-count-estimate',
          label: 'Số vùng tổn thương phát hiện được trên ảnh',
          category: 'MORPHOLOGY' as const,
          baseline: 1,
          current: 1,
          unit: '{count}',
          source: LesionMetricSource.IMAGE_ANALYSIS,
          confidence: 0.9,
          measurementMethod: 'Đếm vùng phân đoạn liên thông (demo, không phải AI thật)',
          missingReason: null,
        },
        {
          key: 'new-lesion-region-detected',
          label: 'Phát hiện vùng tổn thương mới',
          category: 'OTHER' as const,
          baseline: 0,
          current: 0,
          unit: '{boolean}',
          source: LesionMetricSource.IMAGE_ANALYSIS,
          confidence: 0.9,
          measurementMethod: 'So sánh vùng phân đoạn giữa hai mốc (demo, không phải AI thật)',
          missingReason: null,
        },
      ],
      newRegionDetected: false,
    };
  }
}
