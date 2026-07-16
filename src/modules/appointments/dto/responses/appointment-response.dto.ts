import { ApiProperty } from '@nestjs/swagger';

const TOKEN_STATUS_VALUES = ['active', 'used', 'expired', 'revoked', 'replaced'] as const;

export class CheckInTokenResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) appointmentId!: string;
  @ApiProperty({ enum: TOKEN_STATUS_VALUES }) status!: (typeof TOKEN_STATUS_VALUES)[number];
  @ApiProperty({ format: 'date-time' }) issuedAt!: string;
  @ApiProperty({ format: 'date-time' }) validFrom!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
  @ApiProperty() version!: number;
}

/** The raw token value is returned exactly once, at issuance — never stored,
 * never re-returned by any GET (docs/api.md section 21 APT-3). */
export class CheckInTokenIssuedResponseDto extends CheckInTokenResponseDto {
  @ApiProperty() token!: string;
}

export class RevokeCheckInTokenResponseDto {
  @ApiProperty() revoked!: boolean;
}

const MODE_VALUES = ['video', 'in_person'] as const;
const STATUS_VALUES = ['upcoming', 'done', 'cancelled', 'missed'] as const;

export class AppointmentResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) organizationId!: string;
  @ApiProperty({ format: 'uuid' }) clinicLocationId!: string;
  @ApiProperty({ format: 'uuid' }) patientId!: string;
  @ApiProperty({ format: 'uuid' }) doctorId!: string;
  @ApiProperty() department!: string;
  @ApiProperty({ nullable: true }) consultationType!: string | null;
  @ApiProperty({ enum: MODE_VALUES }) mode!: (typeof MODE_VALUES)[number];
  @ApiProperty({ enum: STATUS_VALUES }) status!: (typeof STATUS_VALUES)[number];
  @ApiProperty({ format: 'date-time' }) startAt!: string;
  @ApiProperty({ format: 'date-time' }) endAt!: string;
  @ApiProperty({ format: 'uuid', nullable: true }) encounterId!: string | null;
  @ApiProperty({ nullable: true }) cancelReason!: string | null;
  @ApiProperty() version!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class AppointmentWithCheckInTokenResponseDto extends AppointmentResponseDto {
  @ApiProperty({ type: () => CheckInTokenIssuedResponseDto })
  checkInToken!: CheckInTokenIssuedResponseDto;
}
