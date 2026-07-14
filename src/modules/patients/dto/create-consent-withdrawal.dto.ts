import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { KNOWN_CONSENT_TYPES } from '../consents.repository';

export class CreateConsentWithdrawalRequest {
  @ApiProperty({ enum: KNOWN_CONSENT_TYPES })
  @IsIn(KNOWN_CONSENT_TYPES)
  type!: (typeof KNOWN_CONSENT_TYPES)[number];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  version!: number;
}
