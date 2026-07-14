import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export const OUTBOX_QUEUE = 'outbox-dispatch';

/**
 * Polls pending outbox rows with `FOR UPDATE SKIP LOCKED` so multiple API
 * instances can run this cron concurrently without double-dispatching, then
 * hands each event to BullMQ (job id = outbox row id, so re-adding is a no-op).
 * This is the "dispatcher" stage of outbox → dispatcher → BullMQ → worker.
 */
@Injectable()
export class OutboxDispatcherService {
  private readonly logger = new Logger(OutboxDispatcherService.name);
  private dispatching = false;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(OUTBOX_QUEUE) private readonly queue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async dispatchPending(): Promise<void> {
    if (this.dispatching) return;
    this.dispatching = true;
    try {
      await this.prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<
          Array<{ id: string; event_type: string; payload: unknown }>
        >`
          SELECT id, event_type, payload
          FROM outbox_events
          WHERE status = 'pending' AND available_at <= now()
          ORDER BY available_at
          LIMIT 50
          FOR UPDATE SKIP LOCKED
        `;
        if (rows.length === 0) return;

        for (const row of rows) {
          await this.queue.add(
            row.event_type,
            { outboxEventId: row.id, payload: row.payload },
            { jobId: row.id, removeOnComplete: true, removeOnFail: false },
          );
        }

        await tx.outboxEvent.updateMany({
          where: { id: { in: rows.map((r) => r.id) } },
          data: { status: 'dispatched', dispatchedAt: new Date() },
        });
      });
    } catch (error) {
      this.logger.error('Outbox dispatch failed', error instanceof Error ? error.stack : undefined);
    } finally {
      this.dispatching = false;
    }
  }
}
