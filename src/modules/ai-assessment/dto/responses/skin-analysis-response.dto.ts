import { ApiProperty } from '@nestjs/swagger';

export class SkinPredictionDto {
  @ApiProperty({ example: 4 })
  classIndex!: number;

  @ApiProperty({ example: 'class_04' })
  label!: string;

  @ApiProperty({ example: 0.812345 })
  probability!: number;
}

class AnalyzedImageDto {
  @ApiProperty()
  width!: number;

  @ApiProperty()
  height!: number;
}

export class SkinAnalysisResponseDto {
  @ApiProperty({ example: 'efficientnet_b0' })
  model!: string;

  @ApiProperty()
  modelVersion!: string;

  @ApiProperty({
    description:
      'False means labels.json still contains placeholder names; do not display them as diagnoses.',
  })
  labelsConfigured!: boolean;

  @ApiProperty({ type: AnalyzedImageDto })
  image!: AnalyzedImageDto;

  @ApiProperty({ type: [SkinPredictionDto] })
  predictions!: SkinPredictionDto[];

  @ApiProperty()
  disclaimer!: string;
}
