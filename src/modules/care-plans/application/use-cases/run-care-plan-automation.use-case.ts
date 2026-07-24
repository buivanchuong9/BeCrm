import { Injectable } from '@nestjs/common';
import { AuthenticatedPrincipal } from '../../../../core/security/auth.types';
import { AuditService } from '../../../../core/audit/audit.service';
import { ForbiddenAppError, NotFoundAppError } from '../../../../core/errors/app-error';
import { CarePlansRepository } from '../../infrastructure/repositories/care-plans.repository';
import { CarePlanAccessService } from '../care-plan-access.service';
import { isAutomationEligible } from '../../domain/policies/follow-up-activity-policies';
import { PatientsRepository } from '../../../patients/patients.repository';
import { PublishNotificationsUseCase } from '../../../notifications/application/use-cases/publish-notifications.use-case';
import { toFollowUpActivityResponse } from '../mappers/follow-up-activity.mapper';

type RequestContext = { requestId?: string; ip?: string; userAgent?: string };

/**
 * `POST /patients/{patientId}/care-automation-runs` (contract section 3.3).
 * Resolves the patient's current care plan, processes every eligible
 * scheduled/due activity: `due` activities are completed, `scheduled`
 * activities are left as-is; both get their automation bookkeeping bumped.
 *
 * Transaction/atomicity note (preserved from the pre-extraction behavior):
 * notifications are published as one atomic batch (see
 * PublishNotificationsUseCase -> NotificationsRepository.createMany's
 * internal $transaction), then the activities' status/automation bookkeeping
 * is updated in a separate, non-atomic step afterward.
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

  async execute(principal: AuthenticatedPrincipal, patientId: string, context: RequestContext) {
    this.assertCanRunAutomation(principal);
    await this.access.assertPatientVisible(principal, patientId);

    const plan = await this.carePlans.findLatestForPatient(patientId);
    if (!plan) throw new NotFoundAppError('Care plan not found.');

    const candidates = await this.carePlans.findAutomationCandidates(plan.id);
    const eligible = candidates.filter((activity) => isAutomationEligible(activity.type));
    const dueIds = eligible.filter((activity) => activity.status === 'due').map((a) => a.id);
    const scheduledIds = eligible
      .filter((activity) => activity.status === 'scheduled')
      .map((a) => a.id);

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

    const updated = await this.carePlans.applyAutomationRun(dueIds, scheduledIds);
    const runAt = new Date();

    await this.audit.write({
      actorId: principal.userId,
      action: 'care_plan.automation_run',
      resourceType: 'crm_care_plan',
      resourceId: plan.id,
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
        runAt: runAt.toISOString(),
        activities: updated.map(toFollowUpActivityResponse),
      },
    };
  }

  private assertCanRunAutomation(principal: AuthenticatedPrincipal): void {
    const roles = new Set(principal.memberships.map((m) => m.role));
    const allowed =
      roles.has('super_administrator') ||
      roles.has('system_administrator') ||
      roles.has('medical_administrator') ||
      roles.has('care_coordinator');
    if (!allowed) throw new ForbiddenAppError('AUTH_FORBIDDEN');
  }
}
