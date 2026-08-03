import { Injectable } from '@nestjs/common';
import { LesionComparisonDisposition, LesionRegistrationQuality } from '@prisma/client';
import {
  ImageAnalysisAdapter,
  ImageAnalysisContext,
  ImageAnalysisResult,
} from './image-analysis-adapter.interface';

/**
 * Default adapter for every non-demo comparison. No production
 * image-registration/segmentation model exists yet, so this never invents
 * quality scores or image-derived metrics — it is the safe fallback the
 * spec requires ("normal non-demo data must continue using the existing
 * unavailable/manual review behavior until a real analysis adapter
 * exists"). A clinician can and should still review the original images
 * manually; nothing here blocks that.
 */
@Injectable()
export class UnavailableImageAnalysisAdapter implements ImageAnalysisAdapter {
  readonly name = 'unavailable';

  supports(_params: { lesionId: string }): boolean {
    return true;
  }

  async analyze(_context: ImageAnalysisContext): Promise<ImageAnalysisResult> {
    return {
      isSimulated: false,
      modelName: 'none',
      modelVersion: 'not-applicable',
      algorithmVersion: 'clinical-data-delta/1.0.0',
      visualChangeSummary:
        'Chưa có kết luận hình ảnh tự động. Bảng chỉ số chỉ phản ánh chênh lệch giữa các dữ liệu đã được ghi nhận.',
      limitations: [
        'Không có mô hình đăng ký ảnh hoặc phân tích đáp ứng điều trị đã được thẩm định.',
      ],
      quality: {
        comparabilityScore: null,
        sharpness: null,
        lightingConsistency: null,
        angleConsistency: null,
        scaleConsistency: null,
        occlusion: null,
        registrationQuality: LesionRegistrationQuality.UNAVAILABLE,
        comparisonDisposition: LesionComparisonDisposition.UNAVAILABLE,
        qualityPolicyVersion: null,
        qualityReasons: ['Chưa có bộ phân tích chất lượng và đăng ký ảnh được phê duyệt.'],
      },
      derivedAssets: [],
      metrics: [],
      newRegionDetected: null,
    };
  }
}
