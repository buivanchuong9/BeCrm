import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class InvalidSampleRequest {
  @ApiProperty()
  @IsString()
  reason!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  version!: number;
}
