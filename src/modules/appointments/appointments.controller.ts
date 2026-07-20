import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';
import { CurrentUser } from '../../core/security/current-user.decorator';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { RequireIdempotencyKey } from '../../core/idempotency/idempotency-key.decorator';
import {
  ApiCreatedEnvelope,
  ApiOkEnvelope,
  ApiOkListEnvelope,
} from '../../core/http/api-envelope.decorator';
import {
  AppointmentResponseDto,
  AppointmentWithCheckInTokenResponseDto,
  CheckInTokenIssuedResponseDto,
  RevokeCheckInTokenResponseDto,
} from './dto/responses/appointment-response.dto';
import { CreateAppointmentRequest } from './dto/create-appointment.dto';
import { CancelAppointmentRequest } from './dto/cancel-appointment.dto';
import { RescheduleAppointmentRequest } from './dto/reschedule-appointment.dto';
import { MarkMissedRequest } from './dto/mark-missed.dto';
import { RevokeCheckInTokenRequest } from './dto/revoke-check-in-token.dto';
import { AppointmentsService } from './appointments.service';

const STATUS_VALUES = ['upcoming', 'done', 'cancelled', 'missed'] as const;

class ListAppointmentsQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsIn(STATUS_VALUES) status?: AppointmentStatus;
  @IsOptional() @IsUUID() doctorId?: string;
  @IsOptional() @IsUUID() clinicLocationId?: string;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
}
class SetAppointmentStatusRequest {
  @IsIn(['missed', 'cancelled']) status!: 'missed' | 'cancelled';
  @IsInt() @Min(1) version!: number;
  @IsOptional() @IsString() reason?: string;
}

function requestContext(req: Request) {
  return { requestId: req.requestId, ip: req.ip, userAgent: req.header('user-agent') };
}

@ApiTags('appointments')
@Controller({ path: 'appointments', version: '1' })
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @ApiOkListEnvelope(AppointmentResponseDto)
  @Get()
  async list(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Query() query: ListAppointmentsQuery,
  ) {
    return this.appointmentsService.list(principal, query);
  }

  @ApiOkEnvelope(AppointmentResponseDto)
  @Get(':appointmentId')
  async detail(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ) {
    return this.appointmentsService.getDetail(principal, appointmentId);
  }

  @ApiCreatedEnvelope(AppointmentWithCheckInTokenResponseDto)
  @RequireIdempotencyKey()
  @Post()
  async book(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: CreateAppointmentRequest,
    @Req() req: Request,
  ) {
    return this.appointmentsService.book(principal, dto, requestContext(req));
  }

  @ApiOkEnvelope(AppointmentResponseDto)
  @RequireIdempotencyKey()
  @Post(':appointmentId/cancellations')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body() dto: CancelAppointmentRequest,
    @Req() req: Request,
  ) {
    return this.appointmentsService.cancel(principal, appointmentId, dto, requestContext(req));
  }

  @ApiOkEnvelope(AppointmentWithCheckInTokenResponseDto)
  @RequireIdempotencyKey()
  @Post(':appointmentId/reschedules')
  @HttpCode(HttpStatus.OK)
  async reschedule(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body() dto: RescheduleAppointmentRequest,
    @Req() req: Request,
  ) {
    return this.appointmentsService.reschedule(principal, appointmentId, dto, requestContext(req));
  }

  @ApiOkEnvelope(AppointmentResponseDto)
  @Post(':appointmentId/missed-markings')
  @HttpCode(HttpStatus.OK)
  async markMissed(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body() dto: MarkMissedRequest,
    @Req() req: Request,
  ) {
    return this.appointmentsService.markMissed(principal, appointmentId, dto, requestContext(req));
  }

  @ApiCreatedEnvelope(CheckInTokenIssuedResponseDto)
  @RequireIdempotencyKey()
  @Post(':appointmentId/check-in-tokens')
  async issueCheckInToken(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Req() req: Request,
  ) {
    return this.appointmentsService.issueCheckInToken(
      principal,
      appointmentId,
      requestContext(req),
    );
  }

  @ApiOkEnvelope(RevokeCheckInTokenResponseDto)
  @Post(':appointmentId/check-in-tokens/revocations')
  @HttpCode(HttpStatus.OK)
  async revokeCheckInToken(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body() dto: RevokeCheckInTokenRequest,
    @Req() req: Request,
  ) {
    return this.appointmentsService.revokeCheckInToken(
      principal,
      appointmentId,
      dto,
      requestContext(req),
    );
  }

  @Patch(':appointmentId/status')
  setStatus(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body() dto: SetAppointmentStatusRequest,
    @Req() req: Request,
  ) {
    return dto.status === 'missed'
      ? this.appointmentsService.markMissed(
          principal,
          appointmentId,
          { version: dto.version },
          requestContext(req),
        )
      : this.appointmentsService.cancel(
          principal,
          appointmentId,
          { version: dto.version, reason: dto.reason },
          requestContext(req),
        );
  }

  @Post(':appointmentId/check-in-token')
  issueCheckInTokenAlias(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Req() req: Request,
  ) {
    return this.appointmentsService.issueCheckInToken(
      principal,
      appointmentId,
      requestContext(req),
    );
  }

  @Post(':appointmentId/check-in-token/revoke')
  revokeCheckInTokenAlias(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body() dto: RevokeCheckInTokenRequest,
    @Req() req: Request,
  ) {
    return this.appointmentsService.revokeCheckInToken(
      principal,
      appointmentId,
      dto,
      requestContext(req),
    );
  }
}
