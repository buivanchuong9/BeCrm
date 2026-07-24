import { HttpStatus, Injectable } from '@nestjs/common';
import { AuthenticatedPrincipal } from '../../../../core/security/auth.types';
import { AuditService } from '../../../../core/audit/audit.service';
import { AppError, NotFoundAppError } from '../../../../core/errors/app-error';
import { CarePlansRepository } from '../../infrastructure/repositories/care-plans.repository';
import { CarePlanAccessService } from '../care-plan-access.service';
import { assertKanbanTransitionAllowed } from '../../domain/policies/follow-up-activity-policies';
import { toFollowUpActivityResponse } from '../mappers/follow-up-activity.mapper';
import { TransitionFollowUpActivityRequest } from '../../presentation/requests/transition-follow-up-activity.request';

type RequestContext = { requestId?: string; ip?: string; userAgent?: string };

/** `POST /follow-up-activities/{activityId}/transitions` (contract section
 * 2.2) — the Kanban board's explicit drag-and-drop endpoint. Unlike
 * `/activities/{id}/advance`, this one takes a client-supplied `version` and
 * enforces it atomically against the current `status` in a single
 * `updateMany`, so a version mismatch AND a status raced-out-from-under-us
 * both surface as the same 409 CONCURRENCY_CONFLICT. */
@Injectable()
export class TransitionFollowUpActivityUseCase {
  constructor(
    private readonly carePlans: CarePlansRepository,
    private readonly access: CarePlanAccessService,
    private readonly audit: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    activityId: string,
    dto: TransitionFollowUpActivityRequest,
    context: RequestContext,
  ) {
    const activity = await this.carePlans.findActivityById(activityId);
    if (!activity) throw new NotFoundAppError('Activity not found.');
    const plan = await this.access.resolveCarePlan(principal, activity.carePlanId);

    assertKanbanTransitionAllowed(activity.status, dto.toStatus);

    const result = await this.carePlans.transitionActivityStatus(
      activityId,
      activity.status,
      dto.toStatus,
      dto.version,
    );
    if (result.count === 0) {
      const current = await this.carePlans.findActivityById(activityId);
      throw new AppError(
        'CONCURRENCY_CONFLICT',
        'The activity was modified by another request.',
        HttpStatus.CONFLICT,
        [
          {
            field: 'version',
            code: 'CONCURRENCY_CONFLICT',
            message: `Current version is ${current?.version ?? activity.version}`,
          },
          {
            field: 'status',
            code: 'CONCURRENCY_CONFLICT',
            message: `Current status is ${current?.status ?? activity.status}`,
          },
        ],
      );
    }
    const updated = await this.carePlans.findActivityById(activityId);

    await this.audit.write({
      actorId: principal.userId,
      action: 'follow_up_activity.transitioned',
      resourceType: 'follow_up_activity',
      resourceId: activityId,
      patientId: plan.patientId,
      organizationId: principal.memberships[0]?.organizationId ?? null,
      result: 'success',
      reason: dto.reason ?? null,
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });
    return { data: toFollowUpActivityResponse(updated!) };
  }
}
