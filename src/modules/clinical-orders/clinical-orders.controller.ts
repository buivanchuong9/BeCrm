import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedPrincipal } from '../../common/auth/auth.types';
import { RequireIdempotencyKey } from '../../common/idempotency/idempotency-key.decorator';
import {
  ApiCreatedEnvelope,
  ApiOkEnvelope,
  ApiOkListEnvelope,
} from '../../common/http/api-envelope.decorator';
import { CreateClinicalOrderRequest } from './dto/create-clinical-order.dto';
import { InvalidSampleRequest } from './dto/invalid-sample.dto';
import { SubmitResultRequest } from './dto/submit-result.dto';
import {
  ClinicalOrderResponseDto,
  ClinicalResultResponseDto,
} from './dto/responses/clinical-order-response.dto';
import { ClinicalOrdersService } from './clinical-orders.service';

function requestContext(req: Request) {
  return { requestId: req.requestId, ip: req.ip, userAgent: req.header('user-agent') };
}

@ApiTags('clinical-orders')
@Controller({ path: 'encounters', version: '1' })
export class EncounterClinicalOrdersController {
  constructor(private readonly clinicalOrdersService: ClinicalOrdersService) {}

  @ApiCreatedEnvelope(ClinicalOrderResponseDto)
  @RequireIdempotencyKey({ clinical: true })
  @Post(':encounterId/clinical-orders')
  async create(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @Body() dto: CreateClinicalOrderRequest,
    @Req() req: Request,
  ) {
    return this.clinicalOrdersService.create(principal, encounterId, dto, requestContext(req));
  }

  @ApiOkListEnvelope(ClinicalOrderResponseDto)
  @Get(':encounterId/clinical-orders')
  async list(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.clinicalOrdersService.listForEncounter(principal, encounterId);
  }
}

@ApiTags('clinical-orders')
@Controller({ path: 'clinical-orders', version: '1' })
export class ClinicalOrdersController {
  constructor(private readonly clinicalOrdersService: ClinicalOrdersService) {}

  @ApiOkEnvelope(ClinicalOrderResponseDto)
  @Patch(':orderId/invalid-sample')
  async markInvalidSample(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: InvalidSampleRequest,
    @Req() req: Request,
  ) {
    return this.clinicalOrdersService.markInvalidSample(
      principal,
      orderId,
      dto,
      requestContext(req),
    );
  }

  @ApiCreatedEnvelope(ClinicalResultResponseDto)
  @RequireIdempotencyKey({ clinical: true })
  @Post(':orderId/result')
  async submitResult(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: SubmitResultRequest,
    @Req() req: Request,
  ) {
    return this.clinicalOrdersService.submitResult(principal, orderId, dto, requestContext(req));
  }

  @ApiOkEnvelope(ClinicalResultResponseDto)
  @Get(':orderId/result')
  async getResult(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.clinicalOrdersService.getResult(principal, orderId);
  }
}
