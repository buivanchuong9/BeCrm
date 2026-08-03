import {
  LesionComparisonDisposition,
  LesionImageAsset,
  LesionMetricCategory,
  LesionMetricSource,
  LesionObservation,
  LesionRegistrationQuality,
} from '@prisma/client';

/**
 * An observation with its persisted metrics and image assets loaded — the
 * minimum an adapter needs to assess quality, register images, segment a
 * lesion, and diff two time points.
 */
export type ObservationForAnalysis = LesionObservation & {
  imageAssets: LesionImageAsset[];
};

export interface ImageAnalysisContext {
  comparisonId: string;
  lesionId: string;
  organizationId: string | null;
  baseline: ObservationForAnalysis;
  target: ObservationForAnalysis;
}

export interface ImageQualityAssessment {
  comparabilityScore: number | null;
  sharpness: number | null;
  lightingConsistency: number | null;
  angleConsistency: number | null;
  scaleConsistency: number | null;
  occlusion: number | null;
  registrationQuality: LesionRegistrationQuality;
  comparisonDisposition: LesionComparisonDisposition;
  qualityPolicyVersion: string | null;
  qualityReasons: string[];
}

/**
 * A derived image (ALIGNED/MASK/DIFFERENCE_MAP/THUMBNAIL) the adapter wants
 * persisted. The coordinator is responsible for actually writing bytes
 * through ObjectStorageService and creating the UploadObject +
 * LesionImageAsset rows — adapters only describe what derived asset should
 * exist and provide the bytes to store.
 */
export interface DerivedAssetRequest {
  forObservationId: string;
  originalAssetId: string;
  type: 'ALIGNED' | 'MASK' | 'DIFFERENCE_MAP' | 'THUMBNAIL';
  mimeType: string;
  width: number;
  height: number;
  bytes: Buffer;
  /** Deterministic identity for idempotent re-creation on retry — must be
   * stable for the same (comparisonId, observationId, type) triple. */
  contentKey: string;
}

export interface ImageAnalysisMetric {
  key: string;
  label: string;
  category: LesionMetricCategory;
  baseline: number | null;
  current: number | null;
  unit: string;
  source: LesionMetricSource;
  confidence: number | null;
  measurementMethod: string | null;
  missingReason: string | null;
}

export interface ImageAnalysisResult {
  /** Whether this result is simulated for demonstration purposes. Never
   * true for real patient data — see DemoImageAnalysisAdapter.supports(). */
  isSimulated: boolean;
  modelName: string;
  modelVersion: string;
  algorithmVersion: string;
  visualChangeSummary: string;
  limitations: string[];
  quality: ImageQualityAssessment;
  derivedAssets: DerivedAssetRequest[];
  metrics: ImageAnalysisMetric[];
  newRegionDetected: boolean | null;
}

/**
 * Port for image-level comparison analysis (registration, segmentation,
 * differencing, quality assessment). Never called directly from React —
 * only from ComparisonAnalysisService. Multiple adapters may exist;
 * ComparisonImageAnalysisSelector picks one per comparison.
 */
export interface ImageAnalysisAdapter {
  readonly name: string;
  /** Must be side-effect-free and cheap — evaluated before any observation
   * data is loaded, purely to pick an adapter for this lesion. */
  supports(params: { lesionId: string }): boolean;
  analyze(context: ImageAnalysisContext): Promise<ImageAnalysisResult>;
}
