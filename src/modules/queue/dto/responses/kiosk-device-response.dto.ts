import { ApiProperty } from '@nestjs/swagger';

const STATUS_VALUES = ['active', 'inactive'] as const;

export class KioskDeviceResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) organizationId!: string;
  @ApiProperty({ format: 'uuid' }) clinicLocationId!: string;
  @ApiProperty() label!: string;
  @ApiProperty({ enum: STATUS_VALUES }) status!: (typeof STATUS_VALUES)[number];
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

/** The raw secret is returned exactly once, at registration — never stored,
 * never re-returned (same pattern as CheckInTokenIssuedResponseDto). */
export class KioskDeviceRegisteredResponseDto extends KioskDeviceResponseDto {
  @ApiProperty() deviceSecret!: string;
}
