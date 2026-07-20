import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Body,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../core/security/current-user.decorator';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { RequirePermission } from '../../common/authorization/require-permission.decorator';
import { PERMISSIONS } from '../../common/authorization/permissions.catalog';
import { BreakGlassService } from './break-glass.service';
import { RequestBreakGlassRequest } from './dto/owner-governance.dto';

/** Permission model box 5: choose a patient record → reason → MFA →
 * time-limited, CRITICAL-audited grant. See BreakGlassService for why this
 * is the only legitimate path an Owner has into clinical content. */
@ApiTags('owner-break-glass')
@Controller({ path: 'owner/break-glass', version: '1' })
export class BreakGlassController {
  constructor(private readonly breakGlass: BreakGlassService) {}

  @RequirePermission(PERMISSIONS.BREAK_GLASS_REQUEST)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async request(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: RequestBreakGlassRequest,
    @Req() req: Request,
  ) {
    const grant = await this.breakGlass.request(principal, dto, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
    return { data: grant };
  }

  @RequirePermission(PERMISSIONS.BREAK_GLASS_REQUEST)
  @Post(':grantId/end')
  @HttpCode(HttpStatus.OK)
  async end(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('grantId', ParseUUIDPipe) grantId: string,
    @Req() req: Request,
  ) {
    const grant = await this.breakGlass.end(principal, grantId, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
    return { data: grant };
  }

  @RequirePermission(PERMISSIONS.BREAK_GLASS_REQUEST)
  @Get('mine')
  async listMine(@CurrentUser() principal: AuthenticatedPrincipal) {
    return { data: await this.breakGlass.listMine(principal.userId) };
  }

  @RequirePermission(PERMISSIONS.AUDIT_VIEW)
  @Get()
  async listAll() {
    return { data: await this.breakGlass.listAll() };
  }
}
