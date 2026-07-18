import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Request } from 'express';
import { UserRole, UserStatus } from '@prisma/client';
import { Roles } from '../../common/authorization/roles.decorator';
import { RequirePermission } from '../../common/authorization/require-permission.decorator';
import { PERMISSIONS } from '../../common/authorization/permissions.catalog';
import { NotFoundAppError } from '../../common/errors/app-error';
import { toOffsetPage } from '../../common/pagination/pagination.util';
import { ApiOkEnvelope, ApiOkListEnvelope } from '../../common/http/api-envelope.decorator';
import { UsersRepository } from './users.repository';
import { toUserResponse } from './user-response.mapper';
import { UserResponseDto } from './dto/responses/user-response.dto';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedPrincipal } from '../../common/auth/auth.types';
import { ForbiddenAppError } from '../../common/errors/app-error';
import { UpdateCurrentUserRequest } from './dto/update-current-user.dto';
import { UpsertUserPreferenceRequest } from './dto/upsert-preferences.dto';
import { UserPreferencesRepository } from './user-preferences.repository';
import { StaffInvitationsService } from './staff-invitations.service';

class ListUsersQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(Object.values(UserRole) as UserRole[]) role?: UserRole;
  @IsOptional()
  @IsIn(['pending_activation', 'active', 'suspended', 'deactivated'])
  status?: UserStatus;
}

/** Reference/admin user directory (`GET /users`, `GET /users/{userId}`,
 * restricted to medical/system administrators) plus read/management of
 * pending staff invitations. Invitation *creation* itself lives on
 * `POST /auth/registrations` (see AuthController) — the platform's single
 * account-creation endpoint — not here, so there is exactly one place a
 * new account (of any kind) comes into existence. */
@ApiTags('users')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(
    private readonly users: UsersRepository,
    private readonly preferences: UserPreferencesRepository,
    private readonly invitations: StaffInvitationsService,
  ) {}

  @ApiOkListEnvelope(UserResponseDto)
  @RequirePermission(PERMISSIONS.USER_INVITE)
  @Get('invitations')
  async listPendingInvitations(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    if (
      !principal.memberships.some(
        (m) => m.organizationId === organizationId || m.role === 'super_administrator',
      )
    ) {
      throw new ForbiddenAppError('CLINIC_SCOPE_DENIED', 'No membership in this organization.');
    }
    const rows = await this.invitations.listPending(organizationId);
    return { data: rows };
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(PERMISSIONS.USER_INVITE)
  @Delete('invitations/:invitationId')
  async revokeInvitation(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.invitations.revoke(principal, invitationId, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }

  @ApiOkListEnvelope(UserResponseDto)
  @Roles('medical_administrator', 'system_administrator')
  @Get()
  async list(@Query() query: ListUsersQuery) {
    const { rows, total } = await this.users.list(query);
    const page = toOffsetPage(
      rows.map((u) => toUserResponse(u, this.users.toMembershipScopes(u))),
      total,
      query.page,
      query.limit,
    );
    return { data: page.data, meta: page.meta };
  }

  @ApiOkEnvelope(UserResponseDto)
  @Get(':userId')
  async detail(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    this.assertCanManage(principal, userId);
    const user = await this.users.findByIdWithMemberships(userId);
    if (!user) {
      throw new NotFoundAppError('User not found.');
    }
    return { data: toUserResponse(user, this.users.toMembershipScopes(user)) };
  }

  @ApiOkEnvelope(UserResponseDto)
  @Patch(':userId')
  async update(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateCurrentUserRequest,
  ) {
    this.assertCanManage(principal, userId);
    const user = await this.users.updateProfile(userId, dto.version, {
      ...(dto.name !== undefined ? { displayName: dto.name } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.avatarFileId !== undefined ? { avatarFileId: dto.avatarFileId } : {}),
    });
    return { data: toUserResponse(user, this.users.toMembershipScopes(user)) };
  }

  @Get(':userId/preferences')
  async getPreferences(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    this.assertCanManage(principal, userId);
    return { data: await this.preferences.findOrDefault(userId) };
  }

  @Put(':userId/preferences')
  async putPreferences(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpsertUserPreferenceRequest,
  ) {
    this.assertCanManage(principal, userId);
    return {
      data: await this.preferences.upsert(userId, dto.version, {
        locale: dto.locale,
        timezone: dto.timezone,
        dateFormat: dto.dateFormat,
        theme: dto.theme,
        notificationChannels: { ...dto.notificationChannels },
        deviceSettings: { ...dto.deviceSettings },
      }),
    };
  }

  private assertCanManage(principal: AuthenticatedPrincipal, userId: string) {
    if (principal.userId === userId) return;
    if (
      principal.memberships.some((membership) =>
        ['medical_administrator', 'system_administrator', 'super_administrator'].includes(
          membership.role,
        ),
      )
    )
      return;
    throw new ForbiddenAppError('AUTH_FORBIDDEN', 'You cannot access this user.');
  }
}
