import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SubmitResultRequest {
  @ApiProperty()
  @IsString()
  summary!: string;

  @ApiProperty()
  @IsBoolean()
  abnormal!: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  critical?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  criticalReason?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  version!: number;
}
