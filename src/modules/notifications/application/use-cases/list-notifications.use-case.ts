import { Injectable } from '@nestjs/common';
import { AuthenticatedPrincipal } from '../../../../core/security/auth.types';
import { NotificationsRepository } from '../../infrastructure/repositories/notifications.repository';
import { resolveListRecipientScope } from '../../domain/policies/notification-policies';
import { toNotificationResponse } from '../mappers/notification.mapper';

@Injectable()
export class ListNotificationsUseCase {
  constructor(private readonly notifications: NotificationsRepository) {}

  async execute(principal: AuthenticatedPrincipal, userId: string | undefined, all: boolean) {
    const recipientId = resolveListRecipientScope(principal, userId, all);
    const rows = await this.notifications.findMany(recipientId);
    return { data: rows.map(toNotificationResponse) };
  }
}
