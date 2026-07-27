import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class AcknowledgeCriticalResultRequest {
  @ApiProperty({ description: 'Clinical acknowledgement and immediate action taken.' })
  @IsString()
  @MinLength(3)
  note!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  version!: number;
}
