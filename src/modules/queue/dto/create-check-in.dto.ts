import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCheckInRequest {
  @ApiProperty({ description: 'Raw check-in token scanned from the QR code.' })
  @IsString()
  token!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clinicLocationId!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Registered kiosk/reception device id (docs/api.md section 40 SEC-10).',
  })
  @IsUUID()
  deviceId!: string;

  @ApiProperty()
  @IsString()
  deviceSecret!: string;

  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  patientId?: string;
}
