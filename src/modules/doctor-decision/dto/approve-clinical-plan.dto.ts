import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class ApproveClinicalPlanRequest {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  diagnosisId!: string;

  @ApiProperty()
  @IsString()
  summary!: string;
}
