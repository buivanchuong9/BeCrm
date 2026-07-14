import { ApiProperty } from '@nestjs/swagger';
import { UserMembershipResponseDto } from './user-membership-response.dto';

const API_USER_STATUS_VALUES = ['invited', 'active', 'locked', 'disabled'] as const;

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true })
  phone!: string | null;

  @ApiProperty({ enum: API_USER_STATUS_VALUES })
  status!: (typeof API_USER_STATUS_VALUES)[number];

  @ApiProperty({ type: [UserMembershipResponseDto] })
  memberships!: UserMembershipResponseDto[];

  @ApiProperty()
  version!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
