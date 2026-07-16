import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsString, Min } from 'class-validator';

export class SubmitResultRequest {
  @ApiProperty()
  @IsString()
  summary!: string;

  @ApiProperty()
  @IsBoolean()
  abnormal!: boolean;

  @ApiProperty()
  @IsInt()
  @Min(1)
  version!: number;
}
