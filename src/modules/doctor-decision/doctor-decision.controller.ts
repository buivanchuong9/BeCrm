import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../core/security/current-user.decorator';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { RequireIdempotencyKey } from '../../core/idempotency/idempotency-key.decorator';
import {
  ApiCreatedEnvelope,
  ApiOkEnvelope,
  ApiOkListEnvelope,
} from '../../core/http/api-envelope.decorator';
import { ReviewAssessmentRequest } from './dto/review-assessment.dto';
import { RecordDiagnosisRequest } from './dto/record-diagnosis.dto';
import { ReviseDiagnosisRequest } from './dto/revise-diagnosis.dto';
import { ApproveClinicalPlanRequest } from './dto/approve-clinical-plan.dto';
import {
  ClinicalPlanResponseDto,
  DoctorDiagnosisResponseDto,
  DoctorReviewResponseDto,
} from './dto/responses/doctor-decision-response.dto';
import { DoctorDecisionService } from './doctor-decision.service';

function requestContext(req: Request) {
  return { requestId: req.requestId, ip: req.ip, userAgent: req.header('user-agent') };
}

@ApiTags('doctor-decision')
@Controller({ path: 'encounters', version: '1' })
export class EncounterDoctorDecisionController {
  constructor(private readonly doctorDecisionService: DoctorDecisionService) {}

  @ApiCreatedEnvelope(DoctorReviewResponseDto)
  @RequireIdempotencyKey({ clinical: true })
  @Post(':encounterId/ai-assessments/:aiAssessmentId/reviews')
  async reviewAssessment(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @Param('aiAssessmentId', ParseUUIDPipe) aiAssessmentId: string,
    @Body() dto: ReviewAssessmentRequest,
    @Req() req: Request,
  ) {
    return this.doctorDecisionService.reviewAssessment(
      principal,
      encounterId,
      aiAssessmentId,
      dto,
      requestContext(req),
    );
  }

  @RequireIdempotencyKey({ clinical: true })
  @Post(':encounterId/ai-assessments/:aiAssessmentId/review')
  reviewAssessmentAlias(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @Param('aiAssessmentId', ParseUUIDPipe) assessmentId: string,
    @Body() d: ReviewAssessmentRequest,
    @Req() r: Request,
  ) {
    return this.doctorDecisionService.reviewAssessment(
      p,
      encounterId,
      assessmentId,
      d,
      requestContext(r),
    );
  }

  @ApiOkListEnvelope(DoctorReviewResponseDto)
  @Get(':encounterId/reviews')
  async listReviews(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.doctorDecisionService.listReviews(principal, encounterId);
  }

  @ApiCreatedEnvelope(DoctorDiagnosisResponseDto)
  @RequireIdempotencyKey({ clinical: true })
  @Post(':encounterId/diagnoses')
  async recordDiagnosis(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @Body() dto: RecordDiagnosisRequest,
    @Req() req: Request,
  ) {
    return this.doctorDecisionService.recordDiagnosis(
      principal,
      encounterId,
      dto,
      requestContext(req),
    );
  }

  @ApiOkListEnvelope(DoctorDiagnosisResponseDto)
  @Get(':encounterId/diagnoses')
  async listDiagnoses(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.doctorDecisionService.listDiagnoses(principal, encounterId);
  }

  @ApiCreatedEnvelope(ClinicalPlanResponseDto)
  @RequireIdempotencyKey({ clinical: true })
  @Post(':encounterId/clinical-plan')
  async approveClinicalPlan(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @Body() dto: ApproveClinicalPlanRequest,
    @Req() req: Request,
  ) {
    return this.doctorDecisionService.approveClinicalPlan(
      principal,
      encounterId,
      dto,
      requestContext(req),
    );
  }

  @ApiOkEnvelope(ClinicalPlanResponseDto)
  @Get(':encounterId/clinical-plan')
  async getClinicalPlan(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.doctorDecisionService.getClinicalPlan(principal, encounterId);
  }
}

@ApiTags('doctor-decision')
@Controller({ path: 'diagnoses', version: '1' })
export class DiagnosesController {
  constructor(private readonly doctorDecisionService: DoctorDecisionService) {}

  @ApiCreatedEnvelope(DoctorDiagnosisResponseDto)
  @RequireIdempotencyKey({ clinical: true })
  @Post(':diagnosisId/revisions')
  async reviseDiagnosis(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('diagnosisId', ParseUUIDPipe) diagnosisId: string,
    @Body() dto: ReviseDiagnosisRequest,
    @Req() req: Request,
  ) {
    return this.doctorDecisionService.reviseDiagnosis(
      principal,
      diagnosisId,
      dto,
      requestContext(req),
    );
  }

  @RequireIdempotencyKey({ clinical: true })
  @Post(':diagnosisId/revise')
  reviseDiagnosisAlias(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('diagnosisId', ParseUUIDPipe) id: string,
    @Body() d: ReviseDiagnosisRequest,
    @Req() r: Request,
  ) {
    return this.doctorDecisionService.reviseDiagnosis(p, id, d, requestContext(r));
  }
}
