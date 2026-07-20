import { Injectable } from '@nestjs/common';
import { AuthenticatedPrincipal } from '../../../../core/security/auth.types';
import { AuditService } from '../../../../core/audit/audit.service';
import { NotFoundAppError } from '../../../../core/errors/app-error';
import { NotificationsRepository } from '../../infrastructure/repositories/notifications.repository';
import { assertCanAccessNotification } from '../../domain/policies/notification-policies';
import { toNotificationResponse } from '../mappers/notification.mapper';

type RequestContext = { requestId?: string; ip?: string; userAgent?: string };

@Injectable()
export class ReadNotificationUseCase {
  constructor(
    private readonly notifications: NotificationsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(principal: AuthenticatedPrincipal, id: string, context: RequestContext) {
    const row = await this.notifications.findById(id);
    if (!row) throw new NotFoundAppError('Notification not found.');
    assertCanAccessNotification(principal, row);

    const updated = await this.notifications.markRead(id);
    await this.audit.write({
      actorId: principal.userId,
      action: 'notification.read',
      resourceType: 'notification',
      resourceId: id,
      patientId: row.relatedPatientId,
      organizationId: principal.memberships[0]?.organizationId ?? null,
      result: 'success',
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });
    return { data: toNotificationResponse(updated) };
  }
}
