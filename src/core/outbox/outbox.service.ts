import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';

export interface OutboxWriteInput {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
  /** Defaults to a deterministic hash of type/id/eventType so retried commands
   * inside the same logical operation never enqueue duplicate work. Pass an
   * explicit key for events that must be unique per business occurrence
   * (e.g. `notification:${templateId}:${recipientId}:${dueCycle}`). */
  deliveryKey?: string;
}

/**
 * Must be called with the same Prisma transaction client used for the domain
 * write it accompanies — outbox rows are never written outside the transaction
 * that produced the state change they describe (see spec section 31/33).
 */
@Injectable()
export class OutboxService {
  async write(tx: Prisma.TransactionClient, input: OutboxWriteInput): Promise<void> {
    const deliveryKey = input.deliveryKey ?? defaultDeliveryKey(input);
    await tx.outboxEvent.create({
      data: {
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        eventType: input.eventType,
        payload: input.payload,
        deliveryKey,
      },
    });
  }
}

function defaultDeliveryKey(input: OutboxWriteInput): string {
  return createHash('sha256')
    .update(
      `${input.aggregateType}:${input.aggregateId}:${input.eventType}:${JSON.stringify(input.payload)}`,
    )
    .digest('hex');
}
