import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../../common/authorization/roles.decorator';
import { ApiCreatedEnvelope, ApiOkEnvelope } from '../../core/http/api-envelope.decorator';
import { RequireIdempotencyKey } from '../../core/idempotency/idempotency-key.decorator';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { CurrentUser } from '../../core/security/current-user.decorator';
import {
  AiCommercialRequestResponseDto,
  AiDecisionResponseDto,
  AiEntitlementResponseDto,
  CreateAiCreditPurchaseRequest,
  CreateAiPlanChangeRequest,
  DecideAiCommercialRequest,
} from './dto/ai-entitlement.dto';
import { AiEntitlementsService } from './ai-entitlements.service';

const requestContext = (request: Request) => ({
  requestId: request.requestId,
  ip: request.ip,
  userAgent: request.header('user-agent'),
});

@ApiTags('ai-entitlements')
@ApiBearerAuth()
@Controller({ path: 'patients/me/ai-entitlement', version: '1' })
export class SelfAiEntitlementsController {
  constructor(private readonly entitlements: AiEntitlementsService) {}

  @Get()
  @ApiOkEnvelope(AiEntitlementResponseDto)
  summary(@CurrentUser() principal: AuthenticatedPrincipal) {
    return this.entitlements.getSelfSummary(principal);
  }

  @Post('credit-purchase-requests')
  @RequireIdempotencyKey()
  @ApiCreatedEnvelope(AiCommercialRequestResponseDto)
  createCreditPurchase(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() body: CreateAiCreditPurchaseRequest,
    @Req() request: Request,
  ) {
    return this.entitlements.createCreditPurchase(principal, body.credits, requestContext(request));
  }

  @Post('plan-change-requests')
  @RequireIdempotencyKey()
  @ApiCreatedEnvelope(AiCommercialRequestResponseDto)
  createPlanChange(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() body: CreateAiPlanChangeRequest,
    @Req() request: Request,
  ) {
    return this.entitlements.createPlanChange(principal, body.planCode, requestContext(request));
  }
}

@ApiTags('ai-entitlements')
@ApiBearerAuth()
@Roles('super_administrator', 'system_administrator', 'medical_administrator')
@Controller({ path: 'ai-commercial-requests', version: '1' })
export class AiCommercialRequestsController {
  constructor(private readonly entitlements: AiEntitlementsService) {}

  @Post('credit-purchases/:requestId/decision')
  @RequireIdempotencyKey()
  @ApiOkEnvelope(AiDecisionResponseDto)
  decideCreditPurchase(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() body: DecideAiCommercialRequest,
  ) {
    return this.entitlements.decideCreditPurchase(principal, requestId, body.decision);
  }

  @Post('plan-changes/:requestId/decision')
  @RequireIdempotencyKey()
  @ApiOkEnvelope(AiDecisionResponseDto)
  decidePlanChange(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() body: DecideAiCommercialRequest,
  ) {
    return this.entitlements.decidePlanChange(principal, requestId, body.decision);
  }
}
