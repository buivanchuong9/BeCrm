import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { SessionResponseDto } from './current-user-response.dto';

export class PatientRegistrationResponseDto extends SessionResponseDto {
  @ApiProperty({ enum: ['registered'] })
  mode!: 'registered';
}

export class StaffInvitationRegistrationResponseDto {
  @ApiProperty({ enum: ['invited'] })
  mode!: 'invited';

  @ApiProperty({ format: 'uuid' })
  invitationId!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;

  @ApiProperty({ format: 'uri' })
  activationUrl!: string;
}
