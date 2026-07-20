import { ApiProperty } from '@nestjs/swagger';
import { DangerousActionType, UserRole } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MinLength,
} from 'class-validator';

const DANGEROUS_ACTION_TYPES: DangerousActionType[] = [
  'add_owner',
  'revoke_all_sessions',
  'bulk_directory_export',
  'bulk_membership_revoke',
  'disable_audit',
];

export class SetFeatureFlagOverrideRequest {
  @ApiProperty() @IsBoolean() enabled!: boolean;
}

export class GrantRolePermissionRequest {
  // BUG FIX: was `@IsString()`, so any string reached
  // RolePermissionsService.grant() -> Prisma's `role` enum column, which
  // throws a PrismaClientValidationError (uncaught by GlobalExceptionFilter,
  // falls through to 500) instead of a 400. `@IsEnum` rejects it at the DTO
  // boundary instead.
  @ApiProperty({ enum: UserRole }) @IsEnum(UserRole) role!: UserRole;
  @ApiProperty() @IsString() permissionCode!: string;
}

export class ProposeDangerousActionRequest {
  @ApiProperty({ enum: DANGEROUS_ACTION_TYPES })
  @IsIn(DANGEROUS_ACTION_TYPES)
  type!: DangerousActionType;

  @ApiProperty() @IsString() @MinLength(10) reason!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  payload!: Record<string, unknown>;

  @ApiProperty() @IsString() @Length(6, 6) mfaCode!: string;
}

export class DecideDangerousActionRequest {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';

  @ApiProperty({ required: false }) @IsOptional() @IsString() reason?: string;

  @ApiProperty() @IsString() @Length(6, 6) mfaCode!: string;
}

export class RequestBreakGlassRequest {
  @ApiProperty({ format: 'uuid' }) @IsUUID() patientId!: string;
  @ApiProperty() @IsString() @MinLength(10) reason!: string;
  @ApiProperty() @IsString() @Length(6, 6) mfaCode!: string;
}

export { DANGEROUS_ACTION_TYPES };
