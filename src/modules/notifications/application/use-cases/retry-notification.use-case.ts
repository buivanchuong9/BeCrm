import { Injectable } from '@nestjs/common';
import { AuthenticatedPrincipal } from '../../../../core/security/auth.types';
import { AuditService } from '../../../../core/audit/audit.service';
import { NotificationsRepository } from '../../infrastructure/repositories/notifications.repository';
import { assertNotificationAdmin } from '../../domain/policies/notification-policies';
import { toNotificationResponse } from '../mappers/notification.mapper';

type RequestContext = { requestId?: string; ip?: string; userAgent?: string };

@Injectable()
export class RetryNotificationUseCase {
  constructor(
    private readonly notifications: NotificationsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(principal: AuthenticatedPrincipal, id: string, context: RequestContext) {
    assertNotificationAdmin(principal);

    const updated = await this.notifications.markRetry(id);
    await this.audit.write({
      actorId: principal.userId,
      action: 'notification.retry_requested',
      resourceType: 'notification',
      resourceId: id,
      patientId: updated.relatedPatientId,
      organizationId: principal.memberships[0]?.organizationId ?? null,
      result: 'success',
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });
    return { data: toNotificationResponse(updated) };
  }
}
