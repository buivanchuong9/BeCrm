import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CallNextRequest {
  @ApiProperty({
    required: false,
    description: 'Filter to a specific department. Omit to select globally.',
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clinicLocationId!: string;
}
