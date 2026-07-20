import { Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../../../core/security/current-user.decorator';
import { AuthenticatedPrincipal } from '../../../../core/security/auth.types';
import {
  ApiCreatedEnvelope,
  ApiOkEnvelope,
  ApiOkListEnvelope,
} from '../../../../core/http/api-envelope.decorator';
import { ListNotificationsUseCase } from '../../application/use-cases/list-notifications.use-case';
import { CountUnreadNotificationsUseCase } from '../../application/use-cases/count-unread-notifications.use-case';
import { ReadNotificationUseCase } from '../../application/use-cases/read-notification.use-case';
import { RetryNotificationUseCase } from '../../application/use-cases/retry-notification.use-case';
import {
  NotificationResponseDto,
  UnreadNotificationCountResponseDto,
} from '../responses/notification-response.dto';

const requestContext = (req: Request) => ({
  requestId: req.requestId,
  ip: req.ip,
  userAgent: req.header('user-agent'),
});

/**
 * Extracted from the `operations` grab-bag module (docs/module-capability-map.md).
 * `POST :id/read` and `POST :id/retry` intentionally carry no `@HttpCode` —
 * matching the pre-extraction behavior, their runtime status is Nest's
 * default 201 for POST, documented here via `@ApiCreatedEnvelope` rather than
 * silently "fixed" to 200.
 */
@ApiTags('notifications')
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(
    private readonly listNotifications: ListNotificationsUseCase,
    private readonly countUnreadNotifications: CountUnreadNotificationsUseCase,
    private readonly readNotification: ReadNotificationUseCase,
    private readonly retryNotification: RetryNotificationUseCase,
  ) {}

  @ApiOkListEnvelope(NotificationResponseDto)
  @Get()
  list(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Query('userId') userId?: string,
    @Query('scope') scope?: string,
  ) {
    return this.listNotifications.execute(principal, userId, scope === 'all');
  }

  @ApiOkEnvelope(UnreadNotificationCountResponseDto)
  @Get('unread-count')
  unread(@CurrentUser() principal: AuthenticatedPrincipal, @Query('userId') userId?: string) {
    return this.countUnreadNotifications.execute(principal, userId);
  }

  @ApiCreatedEnvelope(NotificationResponseDto)
  @Post(':notificationId/read')
  read(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('notificationId', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.readNotification.execute(principal, id, requestContext(req));
  }

  @ApiCreatedEnvelope(NotificationResponseDto)
  @Post(':notificationId/retry')
  retry(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('notificationId', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.retryNotification.execute(principal, id, requestContext(req));
  }
}
