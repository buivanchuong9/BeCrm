import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Patch,
  Req,
} from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { IsString, Length } from 'class-validator';
import { CurrentUser } from '../../core/security/current-user.decorator';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { ApiOkEnvelope } from '../../core/http/api-envelope.decorator';
import { UsersRepository } from './users.repository';
import { UserPreferencesRepository } from './user-preferences.repository';
import { NotFoundAppError } from '../../core/errors/app-error';
import { toCurrentUserResponse } from './user-response.mapper';
import { CurrentUserResponseDto } from './dto/responses/current-user-response.dto';
import { UserPreferenceResponseDto } from './dto/responses/user-preference-response.dto';
import { UpdateCurrentUserRequest } from './dto/update-current-user.dto';
import { UpsertUserPreferenceRequest } from './dto/upsert-preferences.dto';
import { MfaService } from './mfa/mfa.service';

class MfaCodeRequest {
  @ApiProperty({
    description: 'Current 6-digit TOTP code from the account authenticator.',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6)
  code!: string;
}

@ApiTags('me')
@Controller({ path: 'me', version: '1' })
export class MeController {
  constructor(
    private readonly users: UsersRepository,
    private readonly preferences: UserPreferencesRepository,
    private readonly mfa: MfaService,
  ) {}

  @ApiOkEnvelope(CurrentUserResponseDto)
  @Get()
  async getProfile(@CurrentUser() principal: AuthenticatedPrincipal) {
    const user = await this.users.findByIdWithMemberships(principal.userId);
    if (!user) {
      throw new NotFoundAppError('User not found.');
    }
    return { data: toCurrentUserResponse(user, this.users.toMembershipScopes(user)) };
  }

  @ApiOkEnvelope(CurrentUserResponseDto)
  @Patch()
  async updateProfile(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: UpdateCurrentUserRequest,
  ) {
    const updated = await this.users.updateProfile(principal.userId, dto.version, {
      ...(dto.displayName !== undefined || dto.name !== undefined
        ? { displayName: dto.displayName ?? dto.name }
        : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.avatarFileId !== undefined ? { avatarFileId: dto.avatarFileId } : {}),
    });
    return { data: toCurrentUserResponse(updated, this.users.toMembershipScopes(updated)) };
  }

  @ApiOkEnvelope(UserPreferenceResponseDto)
  @Get('preferences')
  async getPreferences(@CurrentUser() principal: AuthenticatedPrincipal) {
    const preference = await this.preferences.findOrDefault(principal.userId);
    return { data: this.toPreferenceResponse(preference) };
  }

  @ApiOkEnvelope(UserPreferenceResponseDto)
  @Put('preferences')
  async putPreferences(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: UpsertUserPreferenceRequest,
  ) {
    const updated = await this.preferences.upsert(principal.userId, dto.version, {
      locale: dto.locale,
      timezone: dto.timezone,
      dateFormat: dto.dateFormat,
      theme: dto.theme,
      notificationChannels: { ...dto.notificationChannels },
      deviceSettings: { ...dto.deviceSettings },
    });
    return { data: this.toPreferenceResponse(updated) };
  }

  // MFA: enroll (get a secret + otpauth:// URI, not yet active) →
  // confirm (prove a live code, activates) → disable (requires a live code).
  // Each of the 4 platform Owners is expected to enroll their own — break-
  // glass and dangerous-action approval both require it (docs permission
  // model box 2 "MFA riêng").
  @ApiOkEnvelope(CurrentUserResponseDto)
  @Post('mfa')
  @HttpCode(HttpStatus.OK)
  async beginMfaEnrollment(@CurrentUser() principal: AuthenticatedPrincipal) {
    const result = await this.mfa.beginEnrollment(principal.userId, principal.email);
    return { data: result };
  }

  // SECURITY HARDENING: a 6-digit TOTP code is only ~10^6 possibilities;
  // this previously relied solely on the global default throttle
  // (RATE_LIMIT_MAX, 100/60s) which is not tight enough for a per-account
  // code-guessing endpoint. Matches the tighter throttle already used for
  // login/reset-password.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('mfa/confirmations')
  async confirmMfaEnrollment(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: MfaCodeRequest,
    @Req() req: Request,
  ): Promise<void> {
    await this.mfa.confirmEnrollment(principal.userId, dto.code, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('mfa')
  async disableMfa(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: MfaCodeRequest,
    @Req() req: Request,
  ): Promise<void> {
    await this.mfa.disable(principal.userId, dto.code, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }

  private toPreferenceResponse(preference: {
    userId: string;
    locale: string;
    timezone: string;
    dateFormat: string;
    theme: string;
    notificationChannels: unknown;
    deviceSettings: unknown;
    version: number;
    updatedAt: Date;
  }) {
    return {
      userId: preference.userId,
      locale: preference.locale,
      timezone: preference.timezone,
      dateFormat: preference.dateFormat,
      theme: preference.theme,
      notificationChannels: preference.notificationChannels,
      deviceSettings: preference.deviceSettings,
      version: preference.version,
      updatedAt: preference.updatedAt.toISOString(),
    };
  }
}
