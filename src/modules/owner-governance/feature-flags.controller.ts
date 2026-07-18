import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedPrincipal } from '../../common/auth/auth.types';
import { RequirePermission } from '../../common/authorization/require-permission.decorator';
import { PERMISSIONS } from '../../common/authorization/permissions.catalog';
import { FeatureFlagsService } from '../../common/authorization/feature-flags.service';
import { SetFeatureFlagOverrideRequest } from './dto/owner-governance.dto';

/** Owner surface for the "Feature Flag" box of the authorization decision.
 * Global defaults are seeded (see feature-flags.catalog.ts); an Owner only
 * ever edits per-organization overrides here, never the platform default. */
@ApiTags('owner-feature-flags')
@Controller({ path: 'owner/feature-flags', version: '1' })
export class FeatureFlagsController {
  constructor(private readonly featureFlags: FeatureFlagsService) {}

  @RequirePermission(PERMISSIONS.FEATURE_FLAG_TOGGLE)
  @Get()
  async list() {
    return { data: await this.featureFlags.list() };
  }

  @RequirePermission(PERMISSIONS.FEATURE_FLAG_TOGGLE)
  @Put(':key/organizations/:organizationId')
  async setOverride(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('key') key: string,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: SetFeatureFlagOverrideRequest,
    @Req() req: Request,
  ) {
    const override = await this.featureFlags.setOverride(
      key,
      organizationId,
      dto.enabled,
      principal.userId,
      {
        requestId: req.requestId,
        ip: req.ip,
        userAgent: req.header('user-agent'),
      },
    );
    return { data: override };
  }

  @RequirePermission(PERMISSIONS.FEATURE_FLAG_TOGGLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':key/organizations/:organizationId')
  async clearOverride(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('key') key: string,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.featureFlags.clearOverride(key, organizationId, principal.userId, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }
}
