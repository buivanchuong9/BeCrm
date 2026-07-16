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
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { EncounterStatus } from '@prisma/client';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedPrincipal } from '../../common/auth/auth.types';
import {
  ApiCreatedEnvelope,
  ApiOkEnvelope,
  ApiOkListEnvelope,
} from '../../common/http/api-envelope.decorator';
import {
  EncounterResponseDto,
  EncounterEventResponseDto,
} from './dto/responses/encounter-response.dto';
import { CreateEncounterRequest } from './dto/create-encounter.dto';
import { TransitionEncounterRequest } from './dto/transition-encounter.dto';
import { CloseEncounterRequest } from './dto/close-encounter.dto';
import { EncountersService } from './encounters.service';

const STATUS_VALUES = [
  'registered',
  'intake_in_progress',
  'intake_complete',
  'ai_assessed',
  'routed',
  'checked_in',
  'under_doctor_review',
  'awaiting_results',
  'diagnosed',
  'plan_approved',
  'workflow_active',
  'in_progress',
  'results_complete',
  'final_review',
  'discharge_ready',
  'record_signed',
  'closed',
  'post_visit_monitoring',
  'escalated',
  'follow_up_linked',
] as const;

class ListEncountersQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsIn(STATUS_VALUES) status?: EncounterStatus;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsUUID() clinicLocationId?: string;
}

class ListEncounterEventsQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}

@ApiTags('encounters')
@Controller({ path: 'encounters', version: '1' })
export class EncountersController {
  constructor(private readonly encountersService: EncountersService) {}

  @ApiOkListEnvelope(EncounterResponseDto)
  @Get()
  async list(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Query() query: ListEncountersQuery,
  ) {
    return this.encountersService.list(principal, query);
  }

  // Declared before ':encounterId' so the literal segment is matched first
  // (docs/api.md ENC-4 — never an arbitrary ?patientId=, always the caller's
  // own token-derived patient).
  @ApiOkEnvelope(EncounterResponseDto)
  @Get('active')
  async active(@CurrentUser() principal: AuthenticatedPrincipal) {
    return this.encountersService.getActive(principal);
  }

  @ApiOkEnvelope(EncounterResponseDto)
  @Get(':encounterId')
  async detail(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @Req() req: Request,
  ) {
    return this.encountersService.getDetail(principal, encounterId, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }

  @ApiOkListEnvelope(EncounterEventResponseDto)
  @Get(':encounterId/events')
  async events(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @Query() query: ListEncounterEventsQuery,
  ) {
    return this.encountersService.listEvents(principal, encounterId, query);
  }

  @ApiCreatedEnvelope(EncounterResponseDto)
  @Post()
  async create(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: CreateEncounterRequest,
    @Req() req: Request,
  ) {
    return this.encountersService.create(principal, dto, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }

  // 200, not 201: a command mutating an existing encounter's status in place
  // (docs/api.md section 4 principle 3), not a fresh resource.
  @ApiOkEnvelope(EncounterResponseDto)
  @Post(':encounterId/transitions')
  @HttpCode(HttpStatus.OK)
  async transition(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @Body() dto: TransitionEncounterRequest,
    @Req() req: Request,
  ) {
    return this.encountersService.transition(principal, encounterId, dto, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }

  @ApiOkEnvelope(EncounterResponseDto)
  @Post(':encounterId/closures')
  @HttpCode(HttpStatus.OK)
  async close(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @Body() dto: CloseEncounterRequest,
    @Req() req: Request,
  ) {
    return this.encountersService.close(principal, encounterId, dto, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }

  @Post(':encounterId/transition')
  @HttpCode(HttpStatus.OK)
  transitionAlias(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @Body() dto: TransitionEncounterRequest,
    @Req() req: Request,
  ) {
    return this.encountersService.transition(principal, encounterId, dto, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }

  @Post(':encounterId/close')
  @HttpCode(HttpStatus.OK)
  closeAlias(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @Body() dto: CloseEncounterRequest,
    @Req() req: Request,
  ) {
    return this.encountersService.close(principal, encounterId, dto, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }
}
