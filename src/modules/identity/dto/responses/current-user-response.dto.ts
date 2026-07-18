import { ApiProperty } from '@nestjs/swagger';
import { UserMembershipResponseDto } from './user-membership-response.dto';

const API_USER_STATUS_VALUES = ['invited', 'active', 'locked', 'disabled'] as const;

export class CurrentUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ deprecated: true, description: 'Deprecated alias for displayName.' })
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true })
  phone!: string | null;

  @ApiProperty({
    nullable: true,
    description: 'Short-lived or transformed URL; null until T09 file service ships.',
  })
  avatarUrl!: string | null;

  @ApiProperty({ enum: API_USER_STATUS_VALUES })
  status!: (typeof API_USER_STATUS_VALUES)[number];

  @ApiProperty({ format: 'uuid', nullable: true })
  activeOrganizationId!: string | null;

  @ApiProperty({ type: [UserMembershipResponseDto] })
  memberships!: UserMembershipResponseDto[];

  @ApiProperty()
  version!: number;
}

export class SessionResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ format: 'date-time' })
  accessTokenExpiresAt!: string;

  @ApiProperty({ type: CurrentUserResponseDto })
  user!: CurrentUserResponseDto;
}
