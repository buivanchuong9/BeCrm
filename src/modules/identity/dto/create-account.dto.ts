import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEmail, IsIn, IsOptional, IsString, IsUUID, Matches, MinLength } from 'class-validator';
import { INVITABLE_ROLES } from './invite-staff.dto';

const GENDER_VALUES = ['male', 'female', 'other', 'unknown'] as const;

/**
 * The single account-creation request body, for the single account-creation
 * endpoint (`POST /auth/registrations`). Which fields are required depends
 * on which of the two branches AuthController.register takes — enforced
 * there, not here, since a plain class-validator DTO can't express "these
 * fields are required only when there's no bearer token": an anonymous
 * caller self-registers as a patient (email/password/dob/gender/phone
 * become mandatory); an authenticated caller holding `user.invite` invites
 * staff by role instead (organizationId/role become mandatory, no
 * password — the invitee sets one at activation).
 */
export class CreateAccountRequest {
  @ApiProperty() @IsEmail() email!: string;

  @ApiProperty({ description: 'Full name.' }) @IsString() @MinLength(2) displayName!: string;

  @ApiProperty({
    required: false,
    description: 'Required for self-registration; omitted for a staff invite.',
  })
  @IsOptional()
  @IsString()
  @MinLength(12)
  password?: string;

  @ApiProperty({ required: false, format: 'date', example: '1995-03-15' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dob must be YYYY-MM-DD' })
  dob?: string;

  @ApiProperty({ required: false, enum: GENDER_VALUES })
  @IsOptional()
  @IsIn(GENDER_VALUES)
  gender?: (typeof GENDER_VALUES)[number];

  @ApiProperty({ required: false }) @IsOptional() @IsString() phone?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() address?: string;

  @ApiProperty({ required: false, format: 'uuid' }) @IsOptional() @IsUUID() organizationId?: string;

  @ApiProperty({ required: false, description: 'Public organization code, e.g. dermahealth.' })
  @IsOptional()
  @IsString()
  organizationCode?: string;

  @ApiProperty({
    required: false,
    enum: INVITABLE_ROLES,
    description: 'Staff-invite only — requires an authenticated caller holding `user.invite`.',
  })
  @IsOptional()
  @IsIn(INVITABLE_ROLES)
  role?: UserRole;

  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  clinicLocationId?: string;

  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
