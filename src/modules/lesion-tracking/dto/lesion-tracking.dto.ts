import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  DermatologyAdverseEventSeverity,
  DermatologyAdverseEventUrgency,
  LesionClinicalAssessment,
  LesionLaterality,
  LesionMetricSource,
  LesionReviewDecision,
} from '@prisma/client';

export class LesionListQuery {
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 30;
}

export class CreateLesionRequest {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  bodyRegion!: string;

  @IsEnum(LesionLaterality)
  laterality!: LesionLaterality;

  @IsDateString()
  firstObservedAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  diagnosis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  diagnosisCode?: string;

  @IsOptional()
  @IsUUID()
  clinicianId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  currentTreatment?: string;
}

export class CreateObservationMetricRequest {
  @IsString()
  @MaxLength(100)
  code!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4, allowInfinity: false, allowNaN: false })
  value!: number;

  @IsEnum(LesionMetricSource)
  source!: LesionMetricSource;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  measurementMethod?: string;

  @IsDateString()
  observedAt!: string;
}

export class CreateLesionObservationRequest {
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @IsDateString()
  capturedAt!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsUUID(undefined, { each: true })
  imageAssetIds!: string[];

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  patientReportedSymptoms!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  clinicianNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  treatmentContext?: string;

  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => CreateObservationMetricRequest)
  clinicalMetrics!: CreateObservationMetricRequest[];
}

export class CreateLesionComparisonRequest {
  @IsUUID()
  baselineObservationId!: string;

  @IsUUID()
  targetObservationId!: string;
}

export class CreateLesionReviewRequest {
  @IsEnum(LesionReviewDecision)
  decision!: LesionReviewDecision;

  @IsEnum(LesionClinicalAssessment)
  clinicalAssessment!: LesionClinicalAssessment;

  @IsOptional()
  @IsObject()
  correctedMetrics?: Record<string, number>;

  @IsString()
  @MaxLength(4000)
  comment!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  reason!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(240, { each: true })
  imageLimitations?: string[];

  @IsOptional()
  @IsBoolean()
  requestRecapture?: boolean;
}

export enum LesionMaskCorrectionAction {
  CONFIRM = 'CONFIRM',
  CORRECT = 'CORRECT',
}

export class CorrectLesionMaskRequest {
  @IsEnum(LesionMaskCorrectionAction)
  action!: LesionMaskCorrectionAction;

  /** Required when action = CORRECT: the already-uploaded (POST /uploads)
   * replacement mask image. Ignored for CONFIRM. */
  @IsOptional()
  @IsUUID()
  uploadObjectId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  reason!: string;
}

export class CreateDermatologyAdverseEventRequest {
  @IsOptional()
  @IsUUID()
  lesionId?: string;

  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID(undefined, { each: true })
  suspectedMedicationIds!: string[];

  @IsDateString()
  onsetAt!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  symptoms!: string[];

  @IsEnum(DermatologyAdverseEventSeverity)
  severity!: DermatologyAdverseEventSeverity;

  @IsEnum(DermatologyAdverseEventUrgency)
  urgencyLevel!: DermatologyAdverseEventUrgency;
}

export class LesionTimelineQuery {
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}
