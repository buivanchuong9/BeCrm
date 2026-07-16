import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

const ACTION_VALUES = ['accepted', 'partial', 'rejected'] as const;

export class ReviewAssessmentRequest {
  @ApiProperty({ enum: ACTION_VALUES })
  @IsIn(ACTION_VALUES)
  action!: (typeof ACTION_VALUES)[number];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  acceptedConditionCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  rationale?: string;
}
