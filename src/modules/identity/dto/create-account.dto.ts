import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
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
  @ApiProperty({ example: 'patient@example.com', format: 'email', maxLength: 254 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Email must be a valid email address.' })
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    description: 'Full name. The legacy field `name` is also accepted temporarily.',
    minLength: 2,
    maxLength: 120,
  })
  @ValidateIf((request: CreateAccountRequest) => request.name === undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Display name is required.' })
  @IsNotEmpty({ message: 'Display name is required.' })
  @MinLength(2, { message: 'Display name must be at least 2 characters.' })
  @MaxLength(120)
  displayName?: string;

  @ApiProperty({
    required: false,
    deprecated: true,
    description: 'Deprecated alias for displayName. Remove after the frontend migration window.',
    minLength: 2,
    maxLength: 120,
  })
  @ValidateIf((request: CreateAccountRequest) => request.displayName === undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Display name is required.' })
  @IsNotEmpty({ message: 'Display name is required.' })
  @MinLength(2, { message: 'Display name must be at least 2 characters.' })
  @MaxLength(120)
  name?: string;

  @ApiProperty({
    required: false,
    description: 'Required for self-registration; omitted for a staff invite.',
    minLength: 12,
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters.' })
  @MaxLength(128)
  password?: string;

  @ApiProperty({ required: false, format: 'date', example: '1995-03-15' })
  @IsOptional()
  @IsDateString({ strict: true }, { message: 'Date of birth must be a valid ISO date.' })
  dob?: string;

  @ApiProperty({ required: false, enum: GENDER_VALUES })
  @IsOptional()
  @IsIn(GENDER_VALUES)
  gender?: (typeof GENDER_VALUES)[number];

  @ApiProperty({ required: false, maxLength: 30 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Phone is required.' })
  @MaxLength(30)
  phone?: string;

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiProperty({ required: false, format: 'uuid' }) @IsOptional() @IsUUID() organizationId?: string;

  @ApiProperty({
    required: false,
    maxLength: 100,
    description: 'Public organization code, e.g. dermahealth.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
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
