import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../core/database/prisma.service';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Creates every input as one atomic batch (all-or-nothing) — verbatim
   * atomicity semantics of the pre-extraction operations.service.ts
   * runAutomation(), which wrapped its notification.create() calls in a
   * single $transaction, separate from (and not atomic with) whatever the
   * caller does afterward. */
  createMany(inputs: Prisma.NotificationCreateInput[]) {
    if (inputs.length === 0) return Promise.resolve([]);
    return this.prisma.$transaction(
      inputs.map((input) => this.prisma.notification.create({ data: input })),
    );
  }

  findMany(recipientId: string | undefined) {
    return this.prisma.notification.findMany({
      where: recipientId ? { recipientId } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  countUnread(recipientId: string) {
    return this.prisma.notification.count({ where: { recipientId, read: false } });
  }

  findById(id: string) {
    return this.prisma.notification.findUnique({ where: { id } });
  }

  markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { read: true } });
  }

  markRetry(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { status: 'queued', failureReason: null, retryCount: { increment: 1 } },
    });
  }
}
