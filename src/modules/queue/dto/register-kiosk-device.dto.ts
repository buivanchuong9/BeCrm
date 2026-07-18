import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class RegisterKioskDeviceRequest {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clinicLocationId!: string;

  @ApiProperty({ example: 'Kiosk — Sảnh chính CS-HN-01' })
  @IsString()
  label!: string;
}
