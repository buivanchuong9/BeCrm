import { Injectable } from '@nestjs/common';
import { AuthenticatedPrincipal } from '../../../../core/security/auth.types';
import { AuditService } from '../../../../core/audit/audit.service';
import { ForbiddenAppError } from '../../../../core/errors/app-error';
import { CarePlansRepository } from '../../infrastructure/repositories/care-plans.repository';
import { CarePlanAccessService } from '../care-plan-access.service';
import { isAutomationEligible } from '../../domain/policies/follow-up-activity-policies';
import { PatientsRepository } from '../../../patients/patients.repository';
import { PublishNotificationsUseCase } from '../../../notifications/application/use-cases/publish-notifications.use-case';

type RequestContext = { requestId?: string; ip?: string; userAgent?: string };

/**
 * `POST /care-plans/{carePlanId}/run-automation`. Role gate preserved
 * verbatim (system_administrator/medical_administrator + implicit
 * super_administrator bypass).
 *
 * Transaction/atomicity note (preserved exactly from operations.service.ts):
 * eligible activities' notifications are created as one atomic batch (see
 * PublishNotificationsUseCase -> NotificationsRepository.createMany's
 * internal $transaction), then the activities' automation bookkeeping
 * (`lastAutomatedAt`/`automationRunCount`) is updated in a SEPARATE,
 * non-atomic step afterward — exactly as before. This method does not wrap
 * both steps in one larger transaction; that would be a behavior change, not
 * a refactor.
 *
 * Cross-context notification write (see docs/backend-refactor-plan.md):
 * this use case never touches the Notification table or
 * NotificationsRepository directly — it calls PublishNotificationsUseCase,
 * the one provider NotificationsModule exports for exactly this purpose.
 */
@Injectable()
export class RunCarePlanAutomationUseCase {
  constructor(
    private readonly carePlans: CarePlansRepository,
    private readonly access: CarePlanAccessService,
    private readonly patients: PatientsRepository,
    private readonly publishNotifications: PublishNotificationsUseCase,
    private readonly audit: AuditService,
  ) {}

  async execute(principal: AuthenticatedPrincipal, carePlanId: string, context: RequestContext) {
    this.assertCanRunAutomation(principal);
    const plan = await this.access.resolveCarePlan(principal, carePlanId);

    const candidates = await this.carePlans.findAutomationCandidates(carePlanId);
    const eligible = candidates.filter((activity) => isAutomationEligible(activity.type));

    const recipientId = await this.patients.findUserId(plan.patientId);
    if (recipientId) {
      await this.publishNotifications.execute(
        eligible.map((activity) => ({
          event: 'crm_activity_reminder',
          recipientId,
          recipientRole: 'patient',
          channel: 'in_app',
          message: activity.title,
          relatedPatientId: plan.patientId,
        })),
      );
    }

    await this.carePlans.markActivitiesAutomated(eligible.map((activity) => activity.id));

    await this.audit.write({
      actorId: principal.userId,
      action: 'care_plan.automation_run',
      resourceType: 'crm_care_plan',
      resourceId: carePlanId,
      patientId: plan.patientId,
      organizationId: principal.memberships[0]?.organizationId ?? null,
      result: 'success',
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });

    return {
      data: {
        processed: eligible.length,
        notifications: recipientId ? eligible.length : 0,
      },
    };
  }

  private assertCanRunAutomation(principal: AuthenticatedPrincipal): void {
    const roles = new Set(principal.memberships.map((m) => m.role));
    const allowed =
      roles.has('super_administrator') ||
      roles.has('system_administrator') ||
      roles.has('medical_administrator');
    if (!allowed) throw new ForbiddenAppError('AUTH_FORBIDDEN');
  }
}
