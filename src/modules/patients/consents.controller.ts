import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedPrincipal } from '../../common/auth/auth.types';
import { RequireIdempotencyKey } from '../../common/idempotency/idempotency-key.decorator';
import { ApiOkEnvelope, ApiOkListEnvelope } from '../../common/http/api-envelope.decorator';
import { ConsentResponseDto } from './dto/responses/consent-response.dto';
import { CreateConsentGrantRequest } from './dto/create-consent-grant.dto';
import { CreateConsentWithdrawalRequest } from './dto/create-consent-withdrawal.dto';
import { ConsentsService } from './consents.service';

class ListConsentsQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() type?: string;
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
}
