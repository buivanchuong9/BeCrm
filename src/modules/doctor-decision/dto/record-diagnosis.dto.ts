import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

const STATUS_VALUES = ['provisional', 'confirmed'] as const;

export class RecordDiagnosisRequest {
  @ApiProperty()
  @IsString()
  conditionName!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  conditionCode?: string;

  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  aiAssessmentId?: string;

  @ApiProperty()
  @IsBoolean()
  isAdditionalToAI!: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  rationale?: string;

  @ApiProperty({ enum: STATUS_VALUES })
  @IsIn(STATUS_VALUES)
  status!: (typeof STATUS_VALUES)[number];
}
