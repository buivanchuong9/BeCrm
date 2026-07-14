import { Body, Controller, Get, Put, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedPrincipal } from '../../common/auth/auth.types';
import { ApiOkEnvelope } from '../../common/http/api-envelope.decorator';
import { UsersRepository } from './users.repository';
import { UserPreferencesRepository } from './user-preferences.repository';
import { NotFoundAppError } from '../../common/errors/app-error';
import { toCurrentUserResponse } from './user-response.mapper';
import { CurrentUserResponseDto } from './dto/responses/current-user-response.dto';
import { UserPreferenceResponseDto } from './dto/responses/user-preference-response.dto';
import { UpdateCurrentUserRequest } from './dto/update-current-user.dto';
import { UpsertUserPreferenceRequest } from './dto/upsert-preferences.dto';

@ApiTags('me')
@Controller({ path: 'me', version: '1' })
export class MeController {
  constructor(
    private readonly users: UsersRepository,
    private readonly preferences: UserPreferencesRepository,
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
      ...(dto.name !== undefined ? { displayName: dto.name } : {}),
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
