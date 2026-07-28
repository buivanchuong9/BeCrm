import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

const CARE_PLAN_STAGES = ['induction', 'monitoring', 'response_assessment', 'maintenance'] as const;

export class ProtocolReferenceRequest {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  templateId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  templateVersionId!: string;
}

export class ClinicalPlanMilestoneRequest {
  @ApiProperty()
  @IsString()
  label!: string;

  @ApiProperty({ required: false, format: 'date-time' })
  @IsOptional()
  @IsString()
  targetDate?: string;

  @ApiProperty()
  @IsString()
  status!: string;
}

export class ProtocolDeviationRequest {
  @ApiProperty()
  @IsString()
  reason!: string;
}

export class ApproveClinicalPlanRequest {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  diagnosisId!: string;

  @ApiProperty()
  @IsString()
  summary!: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  measurableGoals?: string[];

  @ApiProperty({ required: false, type: ProtocolReferenceRequest })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProtocolReferenceRequest)
  protocolRef?: ProtocolReferenceRequest;

  @ApiProperty({ required: false, type: [ClinicalPlanMilestoneRequest] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClinicalPlanMilestoneRequest)
  milestones?: ClinicalPlanMilestoneRequest[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  monitoringMetrics?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  stopOrChangeCriteria?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contraindications?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @ApiProperty({ required: false, type: ProtocolDeviationRequest })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProtocolDeviationRequest)
  deviationFromProtocol?: ProtocolDeviationRequest;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  outcome?: string;

  @ApiProperty({ required: false, enum: CARE_PLAN_STAGES })
  @IsOptional()
  @IsIn(CARE_PLAN_STAGES)
  currentStage?: (typeof CARE_PLAN_STAGES)[number];
}

export class ReviseClinicalPlanRequest {
  @ApiProperty()
  @IsInt()
  @Min(1)
  version!: number;

  @ApiProperty()
  @IsString()
  reason!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  measurableGoals?: string[];

  @ApiProperty({ required: false, type: ProtocolReferenceRequest })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProtocolReferenceRequest)
  protocolRef?: ProtocolReferenceRequest;

  @ApiProperty({ required: false, type: [ClinicalPlanMilestoneRequest] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClinicalPlanMilestoneRequest)
  milestones?: ClinicalPlanMilestoneRequest[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  monitoringMetrics?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  stopOrChangeCriteria?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contraindications?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @ApiProperty({ required: false, type: ProtocolDeviationRequest })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProtocolDeviationRequest)
  deviationFromProtocol?: ProtocolDeviationRequest;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  outcome?: string;

  @ApiProperty({ required: false, enum: CARE_PLAN_STAGES })
  @IsOptional()
  @IsIn(CARE_PLAN_STAGES)
  currentStage?: (typeof CARE_PLAN_STAGES)[number];
}
