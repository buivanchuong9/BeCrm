import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedPrincipal } from '../../common/auth/auth.types';
import { ApiOkEnvelope, ApiOkListEnvelope } from '../../common/http/api-envelope.decorator';
import { PatientResponseDto, PatientDetailResponseDto } from './dto/responses/patient-response.dto';
import { UpdatePatientRequest } from './dto/update-patient.dto';
import { PatientsService } from './patients.service';

class ListPatientsQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() search?: string;
  // Accepted for docs/api.md contract compatibility; Patient has no clinic
  // relation yet (only organizationId — see spec section 21's patients row),
  // so this currently has no filtering effect. Revisit once T06 appointments
  // introduce a real patient<->clinic relationship to filter through.
  @IsOptional() @IsUUID() clinicId?: string;
  @IsOptional() @IsUUID() primaryDoctorId?: string;
  @IsOptional() @IsString() sortBy?: string;
  @IsOptional() @IsString() sortOrder?: 'asc' | 'desc';
}

@ApiTags('patients')
@Controller({ path: 'patients', version: '1' })
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @ApiOkListEnvelope(PatientResponseDto)
  @Get()
  async list(@CurrentUser() principal: AuthenticatedPrincipal, @Query() query: ListPatientsQuery) {
    return this.patientsService.list(principal, query);
  }

  // Declared before ':patientId' so the literal segment is matched first.
  @ApiOkEnvelope(PatientDetailResponseDto)
  @Get('me')
  async self(@CurrentUser() principal: AuthenticatedPrincipal, @Req() req: Request) {
    return this.patientsService.getSelf(principal, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }

  @ApiOkEnvelope(PatientDetailResponseDto)
  @Get(':patientId')
  async detail(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Req() req: Request,
  ) {
    return this.patientsService.getDetail(principal, patientId, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }

  @ApiOkEnvelope(PatientResponseDto)
  @Patch(':patientId')
  async update(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: UpdatePatientRequest,
    @Req() req: Request,
  ) {
    return this.patientsService.update(principal, patientId, dto, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }
}
