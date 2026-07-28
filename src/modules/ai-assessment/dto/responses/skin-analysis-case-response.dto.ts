import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SkinImageQualityDto {
  @ApiProperty() usable!: boolean;
  @ApiProperty() score!: number;
  @ApiProperty({ type: [String] }) issues!: string[];
}

class CasePredictionDto {
  @ApiProperty() classIndex!: number;
  @ApiPropertyOptional() label?: string;
  @ApiProperty() probability!: number;
}

class GradCamDto {
  @ApiProperty({ enum: ['grad_cam'] }) method!: 'grad_cam';
  @ApiProperty() targetLayer!: string;
  @ApiProperty() targetClassIndex!: number;
  @ApiProperty() width!: number;
  @ApiProperty() height!: number;
  @ApiProperty({ enum: ['image/png'] }) mimeType!: 'image/png';
  @ApiProperty({ description: 'Sanitized 224x224 PNG overlay, no source EXIF metadata.' })
  dataUrl!: string;
  @ApiProperty() allZero!: boolean;
}

class SanitizedOriginalDto {
  @ApiProperty() width!: number;
  @ApiProperty() height!: number;
  @ApiProperty({ enum: ['image/jpeg'] }) mimeType!: 'image/jpeg';
  @ApiProperty({ description: 'EXIF-stripped 224x224 rendering for side-by-side review.' })
  dataUrl!: string;
}

class CaseImageResultDto {
  @ApiProperty({ enum: ['overview', 'closeup', 'alternate'] })
  role!: 'overview' | 'closeup' | 'alternate';
  @ApiProperty() width!: number;
  @ApiProperty() height!: number;
  @ApiProperty({ type: SkinImageQualityDto }) quality!: SkinImageQualityDto;
  @ApiPropertyOptional({ type: SanitizedOriginalDto, nullable: true })
  original?: SanitizedOriginalDto | null;
  @ApiProperty({ type: [CasePredictionDto] }) predictions!: CasePredictionDto[];
  @ApiPropertyOptional({ type: GradCamDto, nullable: true }) heatmap?: GradCamDto | null;
}

class CaseAggregateDto {
  @ApiProperty({ type: [CasePredictionDto] }) predictions!: CasePredictionDto[];
  @ApiProperty() agreement!: number;
  @ApiProperty({ type: [String] }) conflictingImages!: string[];
  @ApiProperty() abstained!: boolean;
  @ApiProperty({ type: [String] }) abstainReasons!: string[];
  @ApiProperty() aggregationMethod!: string;
  @ApiProperty() validationStatus!: string;
}

class CaseTriageDto {
  @ApiProperty({ enum: ['emergency', 'urgent', 'soon', 'routine'] })
  level!: 'emergency' | 'urgent' | 'soon' | 'routine';
  @ApiProperty({ type: [String] }) reasons!: string[];
  @ApiProperty() basis!: string;
}

export class SkinAnalysisCaseResponseDto {
  @ApiProperty({ format: 'uuid' }) caseId!: string;
  @ApiProperty({ enum: ['completed', 'partial', 'abstained', 'failed'] })
  status!: 'completed' | 'partial' | 'abstained' | 'failed';
  @ApiProperty() model!: string;
  @ApiProperty() modelVersion!: string;
  @ApiProperty({
    example: 'cuda:0',
    description: 'Production requires cuda:0; AI service refuses startup without CUDA.',
  })
  device!: string;
  @ApiProperty() labelsVersion!: string;
  @ApiPropertyOptional({ nullable: true }) calibrationVersion!: string | null;
  @ApiProperty() preprocessingVersion!: string;
  @ApiProperty() labelsConfigured!: boolean;
  @ApiProperty({ format: 'date-time' }) generatedAt!: string;
  @ApiPropertyOptional() requestId?: string;
  @ApiProperty({ type: [CaseImageResultDto] }) images!: CaseImageResultDto[];
  @ApiProperty({ type: CaseAggregateDto }) aggregate!: CaseAggregateDto;
  @ApiProperty({ type: CaseTriageDto }) triage!: CaseTriageDto;
  @ApiProperty() disclaimer!: string;
}
