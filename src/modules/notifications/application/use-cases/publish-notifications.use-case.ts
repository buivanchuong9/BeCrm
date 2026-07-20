import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from '../../infrastructure/repositories/notifications.repository';

/**
 * Narrow cross-module publishing surface for other bounded contexts that
 * need to create notifications (first consumer: care-plans' automation run —
 * see docs/backend-refactor-plan.md's cross-context notification write).
 * Deliberately only the fields actually populated by that caller today;
 * extend when a second consumer needs more of Notification's optional
 * relation fields (relatedEncounterId, relatedWorkflowTaskId).
 */
export interface NotificationPublishInput {
  event: string;
  recipientId: string;
  recipientRole: string;
  channel: string;
  message: string;
  relatedPatientId?: string | null;
}

@Injectable()
export class PublishNotificationsUseCase {
  constructor(private readonly notifications: NotificationsRepository) {}

  async execute(inputs: NotificationPublishInput[]): Promise<void> {
    await this.notifications.createMany(inputs);
  }
}
