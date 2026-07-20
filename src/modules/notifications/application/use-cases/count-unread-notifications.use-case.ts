import { Injectable } from '@nestjs/common';
import { AuthenticatedPrincipal } from '../../../../core/security/auth.types';
import { NotificationsRepository } from '../../infrastructure/repositories/notifications.repository';
import { assertCanViewRecipient } from '../../domain/policies/notification-policies';

@Injectable()
export class CountUnreadNotificationsUseCase {
  constructor(private readonly notifications: NotificationsRepository) {}

  async execute(principal: AuthenticatedPrincipal, userId: string | undefined) {
    const recipientId = userId ?? principal.userId;
    assertCanViewRecipient(principal, recipientId);
    const count = await this.notifications.countUnread(recipientId);
    return { data: { count } };
  }
}
