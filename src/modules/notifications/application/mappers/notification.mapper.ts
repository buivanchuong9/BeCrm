import { Notification } from '@prisma/client';
import { NotificationResponseDto } from '../../presentation/responses/notification-response.dto';

export function toNotificationResponse(notification: Notification): NotificationResponseDto {
  return {
    id: notification.id,
    event: notification.event,
    recipientId: notification.recipientId,
    recipientRole: notification.recipientRole,
    channel: notification.channel,
    status: notification.status,
    message: notification.message,
    relatedPatientId: notification.relatedPatientId,
    relatedEncounterId: notification.relatedEncounterId,
    relatedWorkflowTaskId: notification.relatedWorkflowTaskId,
    deliveredAt: notification.deliveredAt ? notification.deliveredAt.toISOString() : null,
    failureReason: notification.failureReason,
    retryCount: notification.retryCount,
    read: notification.read,
    createdAt: notification.createdAt.toISOString(),
  };
}
