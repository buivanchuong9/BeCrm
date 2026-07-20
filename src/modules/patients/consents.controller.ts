import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser } from '../../core/security/current-user.decorator';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { RequireIdempotencyKey } from '../../core/idempotency/idempotency-key.decorator';
import { ApiOkEnvelope, ApiOkListEnvelope } from '../../core/http/api-envelope.decorator';
import { ConsentResponseDto } from './dto/responses/consent-response.dto';
import { CreateConsentGrantRequest } from './dto/create-consent-grant.dto';
import { CreateConsentWithdrawalRequest } from './dto/create-consent-withdrawal.dto';
import { ConsentsService } from './consents.service';

class ListConsentsQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() type?: string;
}

class SetConsentRequest {
  @IsBoolean() granted!: boolean;
  @IsOptional() @IsString() policyVersion?: string;
  @IsOptional() @IsString() reason?: string;
}

@ApiTags('consents')
@Controller({ path: 'patients/:patientId', version: '1' })
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @ApiOkListEnvelope(ConsentResponseDto)
  @Get('consents')
  async list(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() query: ListConsentsQuery,
  ) {
    return this.consentsService.list(principal, patientId, query);
  }

  // 200, not 201: this is a command on the (patient,type) consent aggregate
  // (upsert-style grant), not fresh resource creation each call — matching
  // the "commands return 200" HTTP rule in docs/api.md section 26, same as
  // every other noun-subresource command (/cancellations, /signatures, etc.).
  @ApiOkEnvelope(ConsentResponseDto)
  @RequireIdempotencyKey()
  @Post('consent-grants')
  @HttpCode(HttpStatus.OK)
  async grant(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateConsentGrantRequest,
    @Req() req: Request,
  ) {
    return this.consentsService.grant(principal, patientId, dto, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }

  @ApiOkEnvelope(ConsentResponseDto)
  @RequireIdempotencyKey()
  @Post('consent-withdrawals')
  @HttpCode(HttpStatus.OK)
  async withdraw(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateConsentWithdrawalRequest,
    @Req() req: Request,
  ) {
    return this.consentsService.withdraw(principal, patientId, dto, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }

  @Put('consents/:type')
  async setConsent(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('type') type: string,
    @Body() dto: SetConsentRequest,
    @Req() req: Request,
  ) {
    return this.consentsService.set(principal, patientId, type, dto, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }
}
