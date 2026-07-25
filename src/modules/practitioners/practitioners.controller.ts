import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { IsUUID } from 'class-validator';
import { CurrentUser } from '../../core/security/current-user.decorator';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import {
  ApiCreatedEnvelope,
  ApiOkEnvelope,
  ApiOkListEnvelope,
} from '../../core/http/api-envelope.decorator';
import { AvailabilityQuery } from './dto/availability.query';
import { ListPractitionersQuery } from './dto/list-practitioners.query';
import { ReplaceWeeklyScheduleRequest } from './dto/replace-weekly-schedule.dto';
import { CreateScheduleExceptionRequest } from './dto/create-schedule-exception.dto';
import { PractitionersService } from './practitioners.service';
import {
  PractitionerAvailabilityResponseDto,
  PractitionerResponseDto,
} from './dto/responses/practitioner-response.dto';
import {
  PractitionerScheduleResponseDto,
  ScheduleExceptionDeletedResponseDto,
  ScheduleExceptionResponseDto,
} from './dto/responses/practitioner-schedule-response.dto';

class ClinicLocationScopedQuery {
  @IsUUID() clinicLocationId!: string;
}

function requestContext(req: Request) {
  return { requestId: req.requestId, ip: req.ip, userAgent: req.header('user-agent') };
}

@ApiTags('practitioners')
@Controller({ path: 'practitioners', version: '1' })
export class PractitionersController {
  constructor(private readonly practitioners: PractitionersService) {}

  @ApiOkListEnvelope(PractitionerResponseDto)
  @Get()
  list(@CurrentUser() principal: AuthenticatedPrincipal, @Query() query: ListPractitionersQuery) {
    return this.practitioners.list(principal, query);
  }

  @ApiOkEnvelope(PractitionerAvailabilityResponseDto)
  @Get(':practitionerId/availability')
  availability(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('practitionerId', ParseUUIDPipe) practitionerId: string,
    @Query() query: AvailabilityQuery,
  ) {
    const clinicLocationId =
      query.clinicLocationId ??
      principal.memberships.find((m) => m.clinicLocationId)?.clinicLocationId;
    if (!clinicLocationId)
      throw new BadRequestException(
        'clinicLocationId is required when the account is not clinic-scoped.',
      );
    return this.practitioners.availability(principal, practitionerId, {
      ...query,
      clinicLocationId,
    });
  }

  @ApiOkEnvelope(PractitionerScheduleResponseDto)
  @Get(':practitionerId/schedule')
  getSchedule(
    @Param('practitionerId', ParseUUIDPipe) practitionerId: string,
    @Query() query: ClinicLocationScopedQuery,
    @CurrentUser() principal: AuthenticatedPrincipal,
  ) {
    return this.practitioners.getSchedule(principal, practitionerId, query.clinicLocationId);
  }

  @ApiOkEnvelope(PractitionerScheduleResponseDto)
  @Put(':practitionerId/schedule')
  replaceSchedule(
    @Param('practitionerId', ParseUUIDPipe) practitionerId: string,
    @Query() query: ClinicLocationScopedQuery,
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: ReplaceWeeklyScheduleRequest,
    @Req() req: Request,
  ) {
    return this.practitioners.replaceWeeklySchedule(
      principal,
      practitionerId,
      query.clinicLocationId,
      dto,
      requestContext(req),
    );
  }

  @ApiOkListEnvelope(ScheduleExceptionResponseDto)
  @Get(':practitionerId/schedule-exceptions')
  listScheduleExceptions(
    @Param('practitionerId', ParseUUIDPipe) practitionerId: string,
    @Query() query: ClinicLocationScopedQuery,
    @CurrentUser() principal: AuthenticatedPrincipal,
  ) {
    return this.practitioners.listScheduleExceptions(
      principal,
      practitionerId,
      query.clinicLocationId,
    );
  }

  @ApiCreatedEnvelope(ScheduleExceptionResponseDto)
  @Post(':practitionerId/schedule-exceptions')
  createScheduleException(
    @Param('practitionerId', ParseUUIDPipe) practitionerId: string,
    @Query() query: ClinicLocationScopedQuery,
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: CreateScheduleExceptionRequest,
    @Req() req: Request,
  ) {
    return this.practitioners.createScheduleException(
      principal,
      practitionerId,
      query.clinicLocationId,
      dto,
      requestContext(req),
    );
  }

  @ApiOkEnvelope(ScheduleExceptionDeletedResponseDto)
  @Delete(':practitionerId/schedule-exceptions/:exceptionId')
  @HttpCode(HttpStatus.OK)
  deleteScheduleException(
    @Param('practitionerId', ParseUUIDPipe) practitionerId: string,
    @Param('exceptionId', ParseUUIDPipe) exceptionId: string,
    @Query() query: ClinicLocationScopedQuery,
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Req() req: Request,
  ) {
    return this.practitioners.deleteScheduleException(
      principal,
      practitionerId,
      query.clinicLocationId,
      exceptionId,
      requestContext(req),
    );
  }
}

@ApiTags('doctors')
@Controller({ path: 'doctors', version: '1' })
export class DoctorsController {
  constructor(private readonly practitioners: PractitionersService) {}

  @Get()
  list(@CurrentUser() principal: AuthenticatedPrincipal, @Query() query: ListPractitionersQuery) {
    return this.practitioners.list(principal, query);
  }

  @Get(':doctorId/availability')
  availability(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
    @Query() query: AvailabilityQuery,
  ) {
    const clinicLocationId =
      query.clinicLocationId ??
      principal.memberships.find((m) => m.clinicLocationId)?.clinicLocationId;
    if (!clinicLocationId)
      throw new BadRequestException(
        'clinicLocationId is required when the account is not clinic-scoped.',
      );
    return this.practitioners.availability(principal, doctorId, { ...query, clinicLocationId });
  }
}
