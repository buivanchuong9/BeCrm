import { Injectable } from '@nestjs/common';
import { AuthenticatedPrincipal } from '../../../../core/security/auth.types';
import { AuditService } from '../../../../core/audit/audit.service';
import { ForbiddenAppError } from '../../../../core/errors/app-error';
import { CarePlansRepository } from '../../infrastructure/repositories/care-plans.repository';
import { CarePlanAccessService } from '../care-plan-access.service';
import { toFollowUpActivityResponse } from '../mappers/follow-up-activity.mapper';

type RequestContext = { requestId?: string; ip?: string; userAgent?: string };

export interface CreateFollowUpActivityInput {
  type: string;
  title: string;
  description: string;
  dueDate: string;
  priority: string;
  status?: string;
  automationMode?: string;
  automationAction?: string;
}

/** `POST /care-plans/{carePlanId}/activities`. Role gate preserved verbatim
 * (care_coordinator/medical_administrator, with the implicit
 * super_administrator bypass every operations.service.ts role check had). */
@Injectable()
export class CreateFollowUpActivityUseCase {
  constructor(
    private readonly carePlans: CarePlansRepository,
    private readonly access: CarePlanAccessService,
    private readonly audit: AuditService,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    carePlanId: string,
    input: CreateFollowUpActivityInput,
    context: RequestContext,
  ) {
    this.assertCanCreate(principal);
    const plan = await this.access.resolveCarePlan(principal, carePlanId);

    const row = await this.carePlans.createActivity({
      carePlanId,
      type: input.type,
      title: input.title,
      description: input.description,
      dueDate: new Date(input.dueDate),
      priority: input.priority,
      status: input.status ?? 'scheduled',
      automationMode: input.automationMode,
      automationAction: input.automationAction,
    });

    await this.audit.write({
      actorId: principal.userId,
      action: 'follow_up_activity.created',
      resourceType: 'follow_up_activity',
      resourceId: row.id,
      patientId: plan.patientId,
      organizationId: principal.memberships[0]?.organizationId ?? null,
      result: 'success',
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });
    return { data: toFollowUpActivityResponse(row) };
  }

  private assertCanCreate(principal: AuthenticatedPrincipal): void {
    const roles = new Set(principal.memberships.map((m) => m.role));
    const allowed =
      roles.has('super_administrator') ||
      roles.has('care_coordinator') ||
      roles.has('medical_administrator');
    if (!allowed) throw new ForbiddenAppError('AUTH_FORBIDDEN');
  }
}
