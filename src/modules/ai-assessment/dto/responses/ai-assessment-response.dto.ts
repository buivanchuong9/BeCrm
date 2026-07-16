import { ApiProperty } from '@nestjs/swagger';
import { SymptomIntakeResponseDto } from './symptom-intake-response.dto';

const STATUS_VALUES = ['completed', 'insufficient_data', 'failed'] as const;
const BAND_VALUES = ['low', 'moderate', 'high'] as const;
const URGENCY_VALUES = ['routine', 'urgent', 'emergency'] as const;

export class CandidateConditionDto {
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: BAND_VALUES }) confidenceBand!: (typeof BAND_VALUES)[number];
  @ApiProperty() confidenceScore!: number;
  @ApiProperty({ type: [String] }) supportingEvidence!: string[];
  @ApiProperty({ type: [String] }) conflictingEvidence!: string[];
  @ApiProperty() rationale!: string;
}

export class AIAssessmentResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) encounterId!: string;
  @ApiProperty({ format: 'uuid' }) intakeId!: string;
  @ApiProperty({ enum: STATUS_VALUES }) status!: (typeof STATUS_VALUES)[number];
  @ApiProperty({ type: [CandidateConditionDto] }) candidateConditions!: CandidateConditionDto[];
  @ApiProperty() redFlagTriggered!: boolean;
  @ApiProperty({ enum: URGENCY_VALUES, nullable: true }) redFlagUrgency!:
    (typeof URGENCY_VALUES)[number] | null;
  @ApiProperty({ type: [String] }) redFlagReasons!: string[];
  @ApiProperty({ nullable: true }) suggestedSpecialty!: string | null;
  @ApiProperty({ type: [String] }) suggestedNextActions!: string[];
  @ApiProperty() modelVersion!: string;
  @ApiProperty({ type: [String] }) missingDataHints!: string[];
  @ApiProperty({ format: 'uuid', nullable: true }) supersededById!: string | null;
  @ApiProperty({ format: 'date-time' }) generatedAt!: string;
}

export class SubmitIntakeResponseDto {
  @ApiProperty({ type: () => SymptomIntakeResponseDto }) intake!: SymptomIntakeResponseDto;
  @ApiProperty({ type: () => AIAssessmentResponseDto }) assessment!: AIAssessmentResponseDto;
}
