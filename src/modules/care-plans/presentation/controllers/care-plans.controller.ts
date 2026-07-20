import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../../../core/security/current-user.decorator';
import { AuthenticatedPrincipal } from '../../../../core/security/auth.types';
import {
  ApiCreatedEnvelope,
  ApiOkEnvelope,
  ApiOkListEnvelope,
} from '../../../../core/http/api-envelope.decorator';
import { GetOrCreateCarePlanUseCase } from '../../application/use-cases/get-or-create-care-plan.use-case';
import { ListFollowUpActivitiesUseCase } from '../../application/use-cases/list-follow-up-activities.use-case';
import { CreateFollowUpActivityUseCase } from '../../application/use-cases/create-follow-up-activity.use-case';
import { AdvanceFollowUpActivityUseCase } from '../../application/use-cases/advance-follow-up-activity.use-case';
import { ConfirmFollowUpActivityUseCase } from '../../application/use-cases/confirm-follow-up-activity.use-case';
import { RunCarePlanAutomationUseCase } from '../../application/use-cases/run-care-plan-automation.use-case';
import { CreateFollowUpActivityRequest } from '../requests/create-follow-up-activity.request';
import { AdvanceFollowUpActivityRequest } from '../requests/advance-follow-up-activity.request';
import {
  CarePlanResponseDto,
  RunCarePlanAutomationResultDto,
} from '../responses/care-plan-response.dto';
import { FollowUpActivityResponseDto } from '../responses/follow-up-activity-response.dto';

const requestContext = (req: Request) => ({
  requestId: req.requestId,
  ip: req.ip,
  userAgent: req.header('user-agent'),
});

/**
 * Extracted from the `operations` grab-bag module (docs/module-capability-map.md).
 * None of these routes carried an explicit `@HttpCode` before extraction, so
 * their runtime status is Nest's method default (200 GET / 201 POST) —
 * preserved verbatim, documented accurately rather than "corrected".
 */
@ApiTags('care-plans')
@Controller({ path: 'patients', version: '1' })
export class PatientCarePlanController {
  constructor(private readonly getOrCreateCarePlan: GetOrCreateCarePlanUseCase) {}

  @ApiOkEnvelope(CarePlanResponseDto)
  @Get(':patientId/care-plan')
  carePlan(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.getOrCreateCarePlan.execute(principal, patientId);
  }
}

@ApiTags('care-plans')
@Controller({ path: 'care-plans', version: '1' })
export class CarePlansController {
  constructor(
    private readonly listActivities: ListFollowUpActivitiesUseCase,
    private readonly createActivity: CreateFollowUpActivityUseCase,
    private readonly runAutomation: RunCarePlanAutomationUseCase,
  ) {}

  @ApiOkListEnvelope(FollowUpActivityResponseDto)
  @Get(':carePlanId/activities')
  activities(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('carePlanId', ParseUUIDPipe) carePlanId: string,
  ) {
    return this.listActivities.execute(principal, carePlanId);
  }

  @ApiCreatedEnvelope(FollowUpActivityResponseDto)
  @Post(':carePlanId/activities')
  create(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('carePlanId', ParseUUIDPipe) carePlanId: string,
    @Body() dto: CreateFollowUpActivityRequest,
    @Req() req: Request,
  ) {
    return this.createActivity.execute(principal, carePlanId, dto, requestContext(req));
  }

  @ApiCreatedEnvelope(RunCarePlanAutomationResultDto)
  @Post(':carePlanId/run-automation')
  automation(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('carePlanId', ParseUUIDPipe) carePlanId: string,
    @Req() req: Request,
  ) {
    return this.runAutomation.execute(principal, carePlanId, requestContext(req));
  }
}

@ApiTags('care-plans')
@Controller({ path: 'activities', version: '1' })
export class ActivitiesController {
  constructor(
    private readonly advanceActivity: AdvanceFollowUpActivityUseCase,
    private readonly confirmActivity: ConfirmFollowUpActivityUseCase,
  ) {}

  @ApiCreatedEnvelope(FollowUpActivityResponseDto)
  @Post(':activityId/advance')
  advance(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Body() dto: AdvanceFollowUpActivityRequest,
    @Req() req: Request,
  ) {
    return this.advanceActivity.execute(principal, activityId, dto.toStatus, requestContext(req));
  }

  @ApiCreatedEnvelope(FollowUpActivityResponseDto)
  @Post(':activityId/confirm')
  confirm(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Req() req: Request,
  ) {
    return this.confirmActivity.execute(principal, activityId, requestContext(req));
  }
}
