import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEmail, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

const INVITABLE_ROLES: UserRole[] = [
  'doctor',
  'nurse',
  'receptionist',
  'lab_technician',
  'imaging_technician',
  'pharmacist',
  'care_coordinator',
  'customer_care_employee',
  'medical_administrator',
  'system_administrator',
  'clinical_process_designer',
];

export { INVITABLE_ROLES };

export class InviteStaffRequest {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() @MinLength(2) displayName!: string;
  @ApiProperty({ enum: INVITABLE_ROLES })
  @IsIn(INVITABLE_ROLES)
  role!: UserRole;
  @ApiProperty({ format: 'uuid' }) @IsUUID() organizationId!: string;
  @ApiProperty({ format: 'uuid', required: false })
  @IsOptional()
  @IsUUID()
  clinicLocationId?: string;
  @ApiProperty({ format: 'uuid', required: false }) @IsOptional() @IsUUID() departmentId?: string;
}

export class AcceptInvitationRequest {
  @ApiProperty() @IsString() token!: string;
  @ApiProperty() @IsString() @MinLength(12) password!: string;
}
