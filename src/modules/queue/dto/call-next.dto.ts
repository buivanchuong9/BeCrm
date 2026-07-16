import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class CallNextRequest {
  @ApiProperty()
  @IsString()
  department!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clinicLocationId!: string;
}
