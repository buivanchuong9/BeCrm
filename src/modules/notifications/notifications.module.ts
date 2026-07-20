import { Module } from '@nestjs/common';
import { AuditModule } from '../../core/audit/audit.module';
import { NotificationsController } from './presentation/controllers/notifications.controller';
import { NotificationsRepository } from './infrastructure/repositories/notifications.repository';
import { ListNotificationsUseCase } from './application/use-cases/list-notifications.use-case';
import { CountUnreadNotificationsUseCase } from './application/use-cases/count-unread-notifications.use-case';
import { ReadNotificationUseCase } from './application/use-cases/read-notification.use-case';
import { RetryNotificationUseCase } from './application/use-cases/retry-notification.use-case';
import { PublishNotificationsUseCase } from './application/use-cases/publish-notifications.use-case';

@Module({
  imports: [AuditModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsRepository,
    ListNotificationsUseCase,
    CountUnreadNotificationsUseCase,
    ReadNotificationUseCase,
    RetryNotificationUseCase,
    PublishNotificationsUseCase,
  ],
  // PublishNotificationsUseCase is this module's narrow cross-context publishing
  // surface (docs/backend-refactor-plan.md) — the only provider other modules
  // may depend on; NotificationsRepository stays unexported/private.
  exports: [PublishNotificationsUseCase],
})
export class NotificationsModule {}
