import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../shared/database/prisma.service';
import { RequestUser } from '../../shared/guards/jwt.strategy';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private prisma: PrismaService) {}

  async list(userId: string, tenantId: string, query?: { isRead?: boolean; page?: number; limit?: number }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { userId, tenantId, deletedAt: null };
    if (query?.isRead !== undefined) where.isRead = query.isRead;

    const [data, total] = await Promise.all([
      this.prisma.notificationHistory.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notificationHistory.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async countUnread(userId: string, tenantId: string) {
    const count = await this.prisma.notificationHistory.count({
      where: { userId, tenantId, isRead: false, deletedAt: null },
    });
    return { count };
  }

  async markRead(id: string, actor: RequestUser) {
    return this.prisma.notificationHistory.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markReadAll(actor: RequestUser) {
    await this.prisma.notificationHistory.updateMany({
      where: { userId: actor.id, tenantId: actor.tenantId, isRead: false, deletedAt: null },
      data: { isRead: true, readAt: new Date() },
    });
    return { message: 'All notifications marked as read' };
  }

  async markUnread(id: string) {
    return this.prisma.notificationHistory.update({
      where: { id },
      data: { isRead: false, readAt: null },
    });
  }

  async delete(id: string, actor: RequestUser) {
    await this.prisma.notificationHistory.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Notification deleted' };
  }

  async send(tenantId: string, userId: string, title: string, body?: string, data?: object, refType?: string, refId?: string) {
    const notification = await this.prisma.notificationHistory.create({
      data: { tenantId, userId, title, body, data, refType, refId },
    });

    // FCM push
    const devices = await this.prisma.fcmDevice.findMany({
      where: { userId, isActive: true, deletedAt: null },
      select: { fcmToken: true },
    });

    if (devices.length > 0) {
      // TODO(UNKNOWN): Integrate firebase-admin for actual FCM push delivery
      this.logger.log(`Would send FCM to ${devices.length} devices for user ${userId}: ${title}`);
    }

    return notification;
  }

  @OnEvent('bpm.task.created')
  async onBpmTaskCreated(event: { tokenId: string; nodeType: string; instanceId: string }) {
    // TODO(UNKNOWN): Look up assignee from token and send notification
    this.logger.log(`BPM task created: ${event.tokenId} (${event.nodeType})`);
  }

  @OnEvent('bpm.instance.completed')
  async onBpmInstanceCompleted(event: { instanceId: string }) {
    this.logger.log(`BPM instance completed: ${event.instanceId}`);
  }
}
