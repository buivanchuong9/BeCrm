import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UserMembershipResponseDto {
  @ApiProperty({ format: 'uuid' })
  organizationId!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  clinicLocationId!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  departmentId!: string | null;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;
}
