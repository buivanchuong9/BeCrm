import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ReviseDiagnosisRequest {
  @ApiProperty()
  @IsString()
  conditionName!: string;

  @ApiProperty()
  @IsString()
  rationale!: string;
}
