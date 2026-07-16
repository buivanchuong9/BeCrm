import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class MarkMissedRequest {
  @ApiProperty()
  @IsInt()
  @Min(1)
  version!: number;
}
