import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { KNOWN_CONSENT_TYPES } from '../consents.repository';

export class CreateConsentGrantRequest {
  @ApiProperty({ enum: KNOWN_CONSENT_TYPES })
  @IsIn(KNOWN_CONSENT_TYPES)
  type!: (typeof KNOWN_CONSENT_TYPES)[number];

  @ApiProperty()
  @IsString()
  policyVersion!: string;

  @ApiProperty({ required: false, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  grantedAt?: string;
}
