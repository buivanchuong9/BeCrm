import { Controller, Get, Post, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { TenantId } from '../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../shared/guards/jwt.strategy';

@ApiTags('notification')
@ApiBearerAuth('JWT')
@Controller('notification/notificationHistory')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get('list')
  @ApiOperation({ summary: 'List notification history for current user' })
  list(@CurrentUser() actor: RequestUser, @TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.notificationService.list(actor.id, tenantId, {
      isRead: query.isRead !== undefined ? query.isRead === 'true' : undefined,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('count')
  @ApiOperation({ summary: 'Count unread notifications' })
  countUnread(@CurrentUser() actor: RequestUser, @TenantId() tenantId: string) {
    return this.notificationService.countUnread(actor.id, tenantId);
  }

  @Post('update')
  @ApiOperation({ summary: 'Mark notification as read' })
  markRead(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.notificationService.markRead(id, actor);
  }

  @Post('update/readAll')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markReadAll(@CurrentUser() actor: RequestUser) {
    return this.notificationService.markReadAll(actor);
  }

  @Post('update/unread')
  @ApiOperation({ summary: 'Mark notification as unread' })
  markUnread(@Query('id') id: string) {
    return this.notificationService.markUnread(id);
  }

  @Delete('delete')
  @ApiOperation({ summary: 'Delete notification' })
  delete(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.notificationService.delete(id, actor);
  }
}
