import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../core/security/current-user.decorator';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { ApiOkEnvelope, ApiOkListEnvelope } from '../../core/http/api-envelope.decorator';
import { AllergyIntoleranceDto } from './dto/responses/lifetime-medical-record-response.dto';
import {
  AllergyKnowledgeAssessmentDto,
  CorrectAllergyDto,
  CreateAllergyDto,
  EnterInErrorDto,
} from './dto/allergy.dto';
import { AllergiesService } from './allergies.service';

@ApiTags('patients')
@Controller({ path: 'patients/:patientId/allergies', version: '1' })
export class AllergiesController {
  constructor(private readonly service: AllergiesService) {}

  @ApiOperation({ summary: 'List all allergy intolerance records for a patient' })
  @ApiOkListEnvelope(AllergyIntoleranceDto)
  @Get()
  list(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.list(principal, patientId);
  }

  @ApiOperation({ summary: 'Record a new allergy intolerance (patient-reported)' })
  @ApiOkEnvelope(AllergyIntoleranceDto)
  @Post()
  create(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateAllergyDto,
  ) {
    return this.service.create(principal, patientId, dto);
  }

  @ApiOperation({ summary: 'Clinician verifies an allergy record' })
  @ApiOkEnvelope(AllergyIntoleranceDto)
  @HttpCode(HttpStatus.OK)
  @Post(':allergyId/verifications')
  verify(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('allergyId', ParseUUIDPipe) allergyId: string,
  ) {
    return this.service.verify(principal, patientId, allergyId);
  }

  @ApiOperation({
    summary:
      'Clinician correction: creates a new verified record and supersedes the old one (immutable).',
  })
  @ApiOkEnvelope(AllergyIntoleranceDto)
  @HttpCode(HttpStatus.OK)
  @Post(':allergyId/corrections')
  correct(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('allergyId', ParseUUIDPipe) allergyId: string,
    @Body() dto: CorrectAllergyDto,
  ) {
    return this.service.correct(principal, patientId, allergyId, dto);
  }

  @ApiOperation({ summary: 'Mark an allergy record as entered-in-error (requires reason)' })
  @ApiOkEnvelope(AllergyIntoleranceDto)
  @HttpCode(HttpStatus.OK)
  @Post(':allergyId/entered-in-error')
  enterInError(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('allergyId', ParseUUIDPipe) allergyId: string,
    @Body() dto: EnterInErrorDto,
  ) {
    return this.service.enterInError(principal, patientId, allergyId, dto);
  }
}

@ApiTags('patients')
@Controller({ path: 'patients/:patientId/allergy-knowledge-assessments', version: '1' })
export class AllergyKnowledgeAssessmentController {
  constructor(private readonly service: AllergiesService) {}

  @ApiOperation({ summary: 'Record an explicit allergy knowledge state assessment' })
  @HttpCode(HttpStatus.OK)
  @Post()
  assess(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: AllergyKnowledgeAssessmentDto,
  ) {
    return this.service.assessKnowledgeState(principal, patientId, dto);
  }
}
