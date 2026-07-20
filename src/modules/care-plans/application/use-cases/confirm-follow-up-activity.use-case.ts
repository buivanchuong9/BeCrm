import { Injectable } from '@nestjs/common';
import { AuthenticatedPrincipal } from '../../../../core/security/auth.types';
import { AuditService } from '../../../../core/audit/audit.service';
import { ForbiddenAppError, NotFoundAppError } from '../../../../core/errors/app-error';
import { CarePlansRepository } from '../../infrastructure/repositories/care-plans.repository';
import { CarePlanAccessService } from '../care-plan-access.service';
import {
  assertConfirmable,
  confirmVersionIncrement,
} from '../../domain/policies/follow-up-activity-policies';
import { toFollowUpActivityResponse } from '../mappers/follow-up-activity.mapper';

type RequestContext = { requestId?: string; ip?: string; userAgent?: string };

/** `POST /activities/{activityId}/confirm`. Role gate preserved verbatim
 * (patient only, plus the implicit super_administrator bypass). */
@Injectable()
export class ConfirmFollowUpActivityUseCase {
  constructor(
    private readonly carePlans: CarePlansRepository,
    private readonly access: CarePlanAccessService,
    private readonly audit: AuditService,
  ) {}

  async execute(principal: AuthenticatedPrincipal, activityId: string, context: RequestContext) {
    this.assertCanConfirm(principal);
    const activity = await this.carePlans.findActivityById(activityId);
    if (!activity) throw new NotFoundAppError('Activity not found.');
    const plan = await this.access.resolveCarePlan(principal, activity.carePlanId);

    assertConfirmable(activity.status);
    const updated = await this.carePlans.updateActivityStatus(
      activityId,
      'completed',
      confirmVersionIncrement(activity.status),
    );

    await this.audit.write({
      actorId: principal.userId,
      action: 'follow_up_activity.confirmed',
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

  private assertCanConfirm(principal: AuthenticatedPrincipal): void {
    const roles = new Set(principal.memberships.map((m) => m.role));
    if (!roles.has('super_administrator') && !roles.has('patient')) {
      throw new ForbiddenAppError('AUTH_FORBIDDEN');
    }
  }
}
