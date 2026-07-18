import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedPrincipal } from '../../common/auth/auth.types';
import { RequirePermission } from '../../common/authorization/require-permission.decorator';
import { PERMISSIONS } from '../../common/authorization/permissions.catalog';
import { DangerousActionsService } from './dangerous-actions.service';
import {
  DecideDangerousActionRequest,
  ProposeDangerousActionRequest,
} from './dto/owner-governance.dto';

/** Permission model box 2, "Tác vụ cực nguy hiểm: cần 2/4" — see
 * DangerousActionsService for the quorum mechanics and each action's
 * executor. */
@ApiTags('owner-dangerous-actions')
@Controller({ path: 'owner/dangerous-actions', version: '1' })
export class DangerousActionsController {
  constructor(private readonly dangerousActions: DangerousActionsService) {}

  @RequirePermission(PERMISSIONS.DANGEROUS_ACTION_PROPOSE)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async propose(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: ProposeDangerousActionRequest,
    @Req() req: Request,
  ) {
    const request = await this.dangerousActions.propose(principal, dto, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
    return { data: request };
  }

  @RequirePermission(PERMISSIONS.DANGEROUS_ACTION_APPROVE)
  @Post(':requestId/approvals')
  @HttpCode(HttpStatus.OK)
  async decide(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: DecideDangerousActionRequest,
    @Req() req: Request,
  ) {
    const request = await this.dangerousActions.decide(principal, requestId, dto, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
    return { data: request };
  }

  @RequirePermission(PERMISSIONS.DANGEROUS_ACTION_APPROVE)
  @Get()
  async list() {
    return { data: await this.dangerousActions.list() };
  }
}
