import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
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
import { SubmitIntakeRequest } from './dto/submit-intake.dto';
import {
  AIAssessmentResponseDto,
  SubmitIntakeResponseDto,
} from './dto/responses/ai-assessment-response.dto';
import { AiAssessmentService } from './ai-assessment.service';

function requestContext(req: Request) {
  return { requestId: req.requestId, ip: req.ip, userAgent: req.header('user-agent') };
}

@ApiTags('ai-assessment')
@Controller({ path: 'encounters', version: '1' })
export class EncounterAiAssessmentController {
  constructor(private readonly aiAssessmentService: AiAssessmentService) {}

  @ApiCreatedEnvelope(SubmitIntakeResponseDto)
  @RequireIdempotencyKey({ clinical: true })
  @Post(':encounterId/intake')
  async submitIntake(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @Body() dto: SubmitIntakeRequest,
    @Req() req: Request,
  ) {
    return this.aiAssessmentService.submitIntake(principal, encounterId, dto, requestContext(req));
  }

  @ApiOkListEnvelope(AIAssessmentResponseDto)
  @Get(':encounterId/ai-assessments')
  async list(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
  ) {
    return this.aiAssessmentService.listForEncounter(principal, encounterId);
  }

  @ApiCreatedEnvelope(SubmitIntakeResponseDto)
  @RequireIdempotencyKey({ clinical: true })
  @Post(':encounterId/ai-assessments/reassessments')
  async reassess(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) encounterId: string,
    @Body() dto: SubmitIntakeRequest,
    @Req() req: Request,
  ) {
    return this.aiAssessmentService.requestReassessment(
      principal,
      encounterId,
      dto,
      requestContext(req),
    );
  }

  @RequireIdempotencyKey({ clinical: true })
  @Post(':encounterId/ai-assessments/reassess')
  reassessAlias(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('encounterId', ParseUUIDPipe) id: string,
    @Body() d: SubmitIntakeRequest,
    @Req() r: Request,
  ) {
    return this.aiAssessmentService.requestReassessment(p, id, d, requestContext(r));
  }
}

@ApiTags('ai-assessment')
@Controller({ path: 'ai-assessments', version: '1' })
export class AiAssessmentDetailController {
  constructor(private readonly aiAssessmentService: AiAssessmentService) {}

  @ApiOkEnvelope(AIAssessmentResponseDto)
  @Get(':assessmentId')
  async detail(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
  ) {
    return this.aiAssessmentService.getDetail(principal, assessmentId);
  }
}
