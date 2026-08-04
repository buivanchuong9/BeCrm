import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LesionClinicalAssessment,
  LesionComparisonDisposition,
  LesionImageAssetType,
  LesionMetricCategory,
  LesionMetricSource,
  LesionRegistrationQuality,
} from '@prisma/client';
import { AppConfiguration } from '../../../core/configuration/configuration';
import { PrismaService } from '../../../core/database/prisma.service';
import { ObjectStorageService } from '../../../core/storage/object-storage.service';
import { SkinAnalysisCaseService } from '../../ai-assessment/skin-analysis-case.service';
import {
  DerivedAssetRequest,
  ImageAnalysisAdapter,
  ImageAnalysisContext,
  ImageAnalysisMetric,
  ImageAnalysisResult,
  ObservationForAnalysis,
} from './image-analysis-adapter.interface';

interface CasePrediction {
  classIndex: number;
  label?: string;
  probability: number;
}

interface CaseQuality {
  usable: boolean;
  score: number;
  issues: string[];
}

interface CaseHeatmap {
  bytes: Buffer;
  mimeType: string;
  width: number;
  height: number;
}

interface CaseSnapshot {
  caseId: string;
  model: string;
  modelVersion: string;
  labelsConfigured: boolean;
  predictions: CasePrediction[];
  quality: CaseQuality;
  heatmap: CaseHeatmap | null;
  triageLevel: string;
}

interface ProgressDerivedAsset {
  role: 'baseline' | 'followup';
  type: 'ALIGNED' | 'MASK' | 'DIFFERENCE_MAP';
  dataUrl: string;
  width: number;
  height: number;
}

interface ProgressComparisonResponse {
  model: string;
  modelVersion: string;
  algorithmVersion: string;
  assessment: LesionClinicalAssessment;
  visualChangeSummary: string;
  limitations: string[];
  quality: {
    comparabilityScore: number | null;
    sharpness: number | null;
    lightingConsistency: number | null;
    angleConsistency: number | null;
    scaleConsistency: number | null;
    occlusion: number | null;
    registrationQuality: 'GOOD' | 'FAIR' | 'POOR' | 'UNAVAILABLE';
    comparisonDisposition: 'COMPARABLE' | 'CAUTION' | 'NOT_COMPARABLE' | 'UNAVAILABLE';
    qualityPolicyVersion: string | null;
    qualityReasons: string[];
  };
  derivedAssets: ProgressDerivedAsset[];
  metrics: Array<{
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
  }>;
  newRegionDetected: boolean | null;
}

const DATA_URL_PATTERN = /^data:image\/png;base64,([a-zA-Z0-9+/=]+)$/;

/**
 * Calls the real self-hosted skin classifier (EfficientNet-B0 image tower +
 * PhoBERT text tower, see be/ai/) once per observation via
 * SkinAnalysisCaseService.runCaseAnalysis(), and derives an
 * ImageAnalysisResult purely from what that model actually returns. This is
 * the adapter real patients get by default — see
 * ComparisonAnalysisService.selectAdapter().
 *
 * The model classifies each photo independently; it does not register/align
 * two photos against each other. So this never fabricates an ALIGNED pair,
 * sub-scores the model doesn't produce (sharpness/lighting/angle/scale), or
 * an overall "improving/worsening" verdict — only what the classifier
 * actually output for each photo, plus an honest same-class confidence
 * comparison between the two time points.
 */
@Injectable()
export class RealImageAnalysisAdapter implements ImageAnalysisAdapter {
  readonly name = 'real';

  constructor(
    private readonly config: ConfigService<AppConfiguration, true>,
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorageService,
    private readonly skinAnalysisCase: SkinAnalysisCaseService,
  ) {}

  supports(_params: { lesionId: string }): boolean {
    return true;
  }

  async analyze(context: ImageAnalysisContext): Promise<ImageAnalysisResult> {
    const organizationId = context.organizationId;
    if (!organizationId) {
      throw new Error('Lesion is missing organizationId; cannot run AI case analysis.');
    }

    const [baselineOriginal, targetOriginal] = await Promise.all([
      this.originalFile(context.baseline),
      this.originalFile(context.target),
    ]);
    const [baselineCase, targetCase, progress] = await Promise.all([
      this.ensureCase(context, context.baseline, organizationId),
      this.ensureCase(context, context.target, organizationId),
      this.compareProgress(context, baselineOriginal, targetOriginal),
    ]);

    const derivedAssets: DerivedAssetRequest[] = [];
    this.pushHeatmapAsset(derivedAssets, context.baseline, baselineCase);
    this.pushHeatmapAsset(derivedAssets, context.target, targetCase);
    this.pushProgressAssets(
      derivedAssets,
      context,
      baselineOriginal.assetId,
      targetOriginal.assetId,
      progress.derivedAssets,
    );

    return {
      isSimulated: false,
      modelName: `${progress.model} + ${targetCase.model}`,
      modelVersion: progress.modelVersion,
      algorithmVersion: progress.algorithmVersion,
      assessment: progress.assessment,
      visualChangeSummary: `${progress.visualChangeSummary} ${this.summarize(baselineCase, targetCase)}`,
      limitations: [
        ...progress.limitations,
        'Grad-CAM chỉ hiển thị vùng mô hình phân loại chú ý; không phải bản đồ thay đổi tổn thương.',
      ],
      quality: {
        ...progress.quality,
        registrationQuality: progress.quality.registrationQuality as LesionRegistrationQuality,
        comparisonDisposition: progress.quality.comparisonDisposition as LesionComparisonDisposition,
        qualityReasons: [
          ...new Set([
            ...progress.quality.qualityReasons,
            ...baselineCase.quality.issues,
            ...targetCase.quality.issues,
          ]),
        ],
      },
      derivedAssets,
      metrics: [
        ...progress.metrics,
        this.confidenceMetric(baselineCase, targetCase),
      ],
      newRegionDetected: progress.newRegionDetected,
    };
  }

  private async originalFile(observation: ObservationForAnalysis) {
    const original = observation.imageAssets.find(
      (asset) => asset.type === LesionImageAssetType.ORIGINAL,
    );
    if (!original) {
      throw new Error(`Observation ${observation.id} has no ORIGINAL image asset.`);
    }
    const upload = await this.prisma.uploadObject.findUniqueOrThrow({
      where: { id: original.uploadObjectId },
    });
    return {
      assetId: original.id,
      bytes: Buffer.from(await this.storage.readObjectBytes(upload.storageKey)),
      mimeType: upload.contentType,
      fileName: upload.fileName,
    };
  }

  private async compareProgress(
    context: ImageAnalysisContext,
    baseline: Awaited<ReturnType<RealImageAnalysisAdapter['originalFile']>>,
    followup: Awaited<ReturnType<RealImageAnalysisAdapter['originalFile']>>,
  ): Promise<ProgressComparisonResponse> {
    const ai = this.config.get('ai', { infer: true });
    const form = new FormData();
    form.append('baseline', new Blob([baseline.bytes], { type: baseline.mimeType }), baseline.fileName);
    form.append('followup', new Blob([followup.bytes], { type: followup.mimeType }), followup.fileName);
    form.append('bodyRegion', context.lesionBodyRegion);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ai.timeoutMs);
    try {
      const response = await fetch(`${ai.serviceUrl}/v1/compare-lesion`, {
        method: 'POST',
        headers: ai.apiKey ? { 'X-AI-API-Key': ai.apiKey } : {},
        body: form,
        signal: controller.signal,
      });
      const text = await response.text();
      if (Buffer.byteLength(text) > ai.maxResponseBytes) {
        throw new Error('AI comparison response exceeded configured size limit.');
      }
      const parsed = JSON.parse(text) as ProgressComparisonResponse | { detail?: string };
      if (!response.ok) {
        throw new Error('detail' in parsed && parsed.detail ? parsed.detail : 'AI comparison failed.');
      }
      return parsed as ProgressComparisonResponse;
    } finally {
      clearTimeout(timeout);
    }
  }

  private pushProgressAssets(
    destination: DerivedAssetRequest[],
    context: ImageAnalysisContext,
    baselineOriginalId: string,
    targetOriginalId: string,
    assets: ProgressDerivedAsset[],
  ): void {
    for (const asset of assets) {
      const match = DATA_URL_PATTERN.exec(asset.dataUrl);
      if (!match) continue;
      const baseline = asset.role === 'baseline';
      const observation = baseline ? context.baseline : context.target;
      destination.push({
        forObservationId: observation.id,
        originalAssetId: baseline ? baselineOriginalId : targetOriginalId,
        type: asset.type,
        mimeType: 'image/png',
        width: asset.width,
        height: asset.height,
        bytes: Buffer.from(match[1], 'base64'),
        contentKey: `${context.comparisonId}:${observation.id}:${asset.type}`,
      });
    }
  }

  private async ensureCase(
    context: ImageAnalysisContext,
    observation: ObservationForAnalysis,
    organizationId: string,
  ): Promise<CaseSnapshot> {
    if (observation.aiSkinAnalysisCaseId) {
      const cached = await this.loadCachedCase(observation.aiSkinAnalysisCaseId);
      if (cached) return cached;
    }

    const original = observation.imageAssets.find(
      (asset) => asset.type === LesionImageAssetType.ORIGINAL,
    );
    if (!original) {
      throw new Error(`Observation ${observation.id} has no ORIGINAL image asset to analyze.`);
    }
    const upload = await this.prisma.uploadObject.findUniqueOrThrow({
      where: { id: original.uploadObjectId },
    });
    const bytes = await this.storage.readObjectBytes(upload.storageKey);

    const { data: result } = await this.skinAnalysisCase.runCaseAnalysis({
      patientId: await this.patientIdFor(observation),
      organizationId,
      actorId: context.requestedById,
      files: {
        closeup: [
          {
            buffer: Buffer.from(bytes),
            mimetype: upload.contentType,
            originalname: upload.fileName,
          },
        ],
      },
      bodyRegion: context.lesionBodyRegion,
      symptoms: observation.patientReportedSymptoms,
      note: observation.clinicianNotes ?? undefined,
      context: {},
    });

    await this.prisma.lesionObservation.update({
      where: { id: observation.id },
      data: { aiSkinAnalysisCaseId: result.caseId },
    });

    const closeup = result.images.find((image) => image.role === 'closeup') ?? result.images[0];
    return {
      caseId: result.caseId,
      model: result.model,
      modelVersion: result.modelVersion,
      labelsConfigured: result.labelsConfigured,
      predictions: closeup?.predictions ?? [],
      quality: closeup?.quality ?? {
        usable: false,
        score: 0,
        issues: ['Không nhận được đánh giá chất lượng từ AI.'],
      },
      heatmap:
        closeup?.heatmap && !closeup.heatmap.allZero ? this.decodeHeatmap(closeup.heatmap) : null,
      triageLevel: result.triage.level,
    };
  }

  /** ObservationForAnalysis doesn't carry the parent lesion's patientId, so
   * fall back to a direct lookup — cheap and only hit on the (rare) first
   * analysis of an observation whose lesion wasn't preloaded by the caller. */
  private async patientIdFor(observation: ObservationForAnalysis): Promise<string> {
    const lesion = await this.prisma.lesion.findUniqueOrThrow({
      where: { id: observation.lesionId },
      select: { patientId: true },
    });
    return lesion.patientId;
  }

  private async loadCachedCase(caseId: string): Promise<CaseSnapshot | null> {
    const row = await this.prisma.aISkinAnalysisCase.findUnique({ where: { id: caseId } });
    if (!row) return null;
    const metadata = Array.isArray(row.imageMetadata)
      ? (row.imageMetadata as Array<Record<string, unknown>>)
      : [];
    const closeup = metadata.find((image) => image.role === 'closeup') ?? metadata[0];
    const heatmapMeta =
      closeup?.heatmap && typeof closeup.heatmap === 'object'
        ? (closeup.heatmap as { allZero?: boolean })
        : null;
    let heatmap: CaseHeatmap | null = null;
    if (heatmapMeta && !heatmapMeta.allZero) {
      const artifact = await this.prisma.aISkinAnalysisArtifact.findFirst({
        where: { caseId, role: 'closeup', kind: 'heatmap' },
      });
      if (artifact) {
        heatmap = {
          bytes: Buffer.from(artifact.content),
          mimeType: artifact.mimeType,
          width: artifact.width,
          height: artifact.height,
        };
      }
    }
    const triage = row.triageOutput as unknown as { level?: string } | null;
    return {
      caseId: row.id,
      model: row.model,
      modelVersion: row.modelVersion,
      labelsConfigured: row.labelsConfigured,
      predictions: (closeup?.predictions as CasePrediction[] | undefined) ?? [],
      quality: (closeup?.quality as CaseQuality | undefined) ?? {
        usable: false,
        score: 0,
        issues: [],
      },
      heatmap,
      triageLevel: triage?.level ?? 'routine',
    };
  }

  private decodeHeatmap(heatmap: {
    dataUrl: string;
    mimeType: string;
    width: number;
    height: number;
  }): CaseHeatmap | null {
    const match = DATA_URL_PATTERN.exec(heatmap.dataUrl);
    if (!match) return null;
    return {
      bytes: Buffer.from(match[1], 'base64'),
      mimeType: heatmap.mimeType,
      width: heatmap.width,
      height: heatmap.height,
    };
  }

  private pushHeatmapAsset(
    derivedAssets: DerivedAssetRequest[],
    observation: ObservationForAnalysis,
    snapshot: CaseSnapshot,
  ): void {
    if (!snapshot.heatmap) return;
    const original = observation.imageAssets.find(
      (asset) => asset.type === LesionImageAssetType.ORIGINAL,
    );
    if (!original) return;
    derivedAssets.push({
      forObservationId: observation.id,
      originalAssetId: original.id,
      type: 'HEATMAP',
      mimeType: snapshot.heatmap.mimeType,
      width: snapshot.heatmap.width,
      height: snapshot.heatmap.height,
      bytes: snapshot.heatmap.bytes,
      contentKey: `${snapshot.caseId}:${observation.id}:HEATMAP`,
    });
  }

  /** Only compares the *same* predicted class across time points — never
   * treats two different classes' probabilities as one measurement. */
  private confidenceMetric(baseline: CaseSnapshot, target: CaseSnapshot): ImageAnalysisMetric {
    const referenceClass = baseline.predictions[0];
    const baselineValue = referenceClass
      ? Math.round(referenceClass.probability * 100 * 100) / 100
      : null;
    const matchInTarget = referenceClass
      ? target.predictions.find((prediction) => prediction.classIndex === referenceClass.classIndex)
      : undefined;
    const currentValue = matchInTarget
      ? Math.round(matchInTarget.probability * 100 * 100) / 100
      : null;
    return {
      key: 'ai-classification-confidence',
      label: 'Độ tin cậy phân loại AI cho nhóm ban đầu',
      category: LesionMetricCategory.OTHER,
      baseline: baselineValue,
      current: currentValue,
      unit: '%',
      source: LesionMetricSource.IMAGE_ANALYSIS,
      confidence: matchInTarget?.probability ?? referenceClass?.probability ?? null,
      measurementMethod: 'Xác suất phân loại của mô hình AI (không phải điểm mức độ nặng)',
      missingReason: !referenceClass
        ? 'Không có kết quả phân loại tại mốc ban đầu.'
        : !matchInTarget
          ? 'Mô hình không xếp hạng nhóm này trong lần chụp hiện tại.'
          : null,
    };
  }

  private summarize(baseline: CaseSnapshot, target: CaseSnapshot): string {
    const sameLabelsConfigured = baseline.labelsConfigured && target.labelsConfigured;
    const topBaseline = baseline.predictions[0];
    const topTarget = target.predictions[0];
    const classChanged =
      topBaseline && topTarget && topBaseline.classIndex !== topTarget.classIndex;
    const triageChanged = baseline.triageLevel !== target.triageLevel;
    const parts: string[] = [];
    if (topBaseline && topTarget) {
      parts.push(
        classChanged
          ? sameLabelsConfigured && topBaseline.label && topTarget.label
            ? `Nhóm phân loại hàng đầu của AI thay đổi từ "${topBaseline.label}" sang "${topTarget.label}".`
            : 'Nhóm phân loại hàng đầu của AI đã thay đổi giữa hai mốc.'
          : 'Nhóm phân loại hàng đầu của AI không đổi giữa hai mốc.',
      );
    } else {
      parts.push('Không đủ dữ liệu phân loại ở một trong hai mốc.');
    }
    if (triageChanged) {
      parts.push(
        `Mức độ ưu tiên gợi ý thay đổi từ "${baseline.triageLevel}" sang "${target.triageLevel}".`,
      );
    }
    parts.push('Đây là gợi ý phân loại từ AI, chưa phải kết luận đáp ứng điều trị.');
    return parts.join(' ');
  }
}
