import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RevokeCheckInTokenRequest {
  @ApiProperty()
  @IsString()
  reason!: string;
}
