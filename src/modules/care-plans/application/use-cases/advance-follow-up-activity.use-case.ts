import { Injectable } from '@nestjs/common';
import { AuthenticatedPrincipal } from '../../../../core/security/auth.types';
import { AuditService } from '../../../../core/audit/audit.service';
import { NotFoundAppError } from '../../../../core/errors/app-error';
import { CarePlansRepository } from '../../infrastructure/repositories/care-plans.repository';
import { CarePlanAccessService } from '../care-plan-access.service';
import { assertAdvanceTransitionAllowed } from '../../domain/policies/follow-up-activity-policies';
import { toFollowUpActivityResponse } from '../mappers/follow-up-activity.mapper';

type RequestContext = { requestId?: string; ip?: string; userAgent?: string };

/** `POST /activities/{activityId}/advance`. Deliberately has no role gate in
 * the source behavior being preserved — not adding one here. */
@Injectable()
export class AdvanceFollowUpActivityUseCase {
  constructor(
    private readonly carePlans: CarePlansRepository,
    private readonly access: CarePlanAccessService,
    private readonly audit: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    activityId: string,
    toStatus: string,
    context: RequestContext,
  ) {
    const activity = await this.carePlans.findActivityById(activityId);
    if (!activity) throw new NotFoundAppError('Activity not found.');
    const plan = await this.access.resolveCarePlan(principal, activity.carePlanId);

    assertAdvanceTransitionAllowed(activity.status, toStatus);
    const updated = await this.carePlans.updateActivityStatus(activityId, toStatus, 1);

    await this.audit.write({
      actorId: principal.userId,
      action: 'follow_up_activity.advanced',
      resourceType: 'follow_up_activity',
      resourceId: activityId,
      patientId: plan.patientId,
      organizationId: principal.memberships[0]?.organizationId ?? null,
      result: 'success',
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });
    return { data: toFollowUpActivityResponse(updated) };
  }
}
