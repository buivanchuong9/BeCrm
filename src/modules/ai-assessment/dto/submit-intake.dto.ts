import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsIn, IsInt, IsString, Max, Min } from 'class-validator';
import { SYMPTOM_KEYS } from '../ai-scoring.util';

export class SubmitIntakeRequest {
  @ApiProperty()
  @IsString()
  chiefComplaint!: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  severity!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  durationDays!: number;

  @ApiProperty({ enum: SYMPTOM_KEYS, isArray: true })
  @IsArray()
  @ArrayUnique()
  @IsIn(SYMPTOM_KEYS, { each: true })
  symptoms!: (typeof SYMPTOM_KEYS)[number][];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  history!: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  currentMedication!: string[];

  @ApiProperty({ type: [String], required: false, default: [] })
  @IsArray()
  @IsString({ each: true })
  images!: string[];
}
