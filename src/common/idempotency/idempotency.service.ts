import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ConflictAppError } from '../errors/app-error';

export interface IdempotencyLookupInput {
  principalId: string | null;
  principalScope: 'user' | 'device' | 'anonymous';
  route: string;
  target?: string;
  idempotencyKey: string;
  requestBody: unknown;
}

export type IdempotencyOutcome =
  { kind: 'replay'; status: number; body: unknown } | { kind: 'proceed'; recordId: string };

const TTL_DEFAULT_MS = 24 * 60 * 60 * 1000;
const TTL_CLINICAL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async begin(input: IdempotencyLookupInput, isClinical = false): Promise<IdempotencyOutcome> {
    const fingerprint = fingerprintOf(input.requestBody);
    const target = input.target ?? '';

    const principalId = input.principalId ?? PLACEHOLDER_NULL_UUID;

    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: {
        uniq_idempotency_scope: {
          principalScope: input.principalScope,
          principalId,
          route: input.route,
          target,
          idempotencyKey: input.idempotencyKey,
        },
      },
    });

    if (existing) {
      if (existing.requestFingerprint !== fingerprint) {
        throw new ConflictAppError(
          'IDEMPOTENCY_KEY_REUSED',
          'This idempotency key was already used with a different request body.',
        );
      }
      if (existing.status === 'completed') {
        return {
          kind: 'replay',
          status: existing.responseStatus ?? 200,
          body: existing.responseBody,
        };
      }
      // in_progress or failed with same fingerprint: allow the caller to retry the operation.
      return { kind: 'proceed', recordId: existing.id };
    }

    const ttlMs = isClinical ? TTL_CLINICAL_MS : TTL_DEFAULT_MS;
    const created = await this.prisma.idempotencyRecord.create({
      data: {
        principalId,
        principalScope: input.principalScope,
        route: input.route,
        target,
        idempotencyKey: input.idempotencyKey,
        requestFingerprint: fingerprint,
        status: 'in_progress',
        expiresAt: new Date(Date.now() + ttlMs),
      },
    });
    return { kind: 'proceed', recordId: created.id };
  }

  async complete(recordId: string, status: number, body: unknown): Promise<void> {
    await this.prisma.idempotencyRecord.update({
      where: { id: recordId },
      data: {
        status: 'completed',
        responseStatus: status,
        responseBody: body as Prisma.InputJsonValue,
      },
    });
  }

  /** Failed transactions must not leave a completed idempotency record — mark it
   * failed instead so a retry with the same key/body is allowed to proceed again. */
  async fail(recordId: string): Promise<void> {
    await this.prisma.idempotencyRecord.update({
      where: { id: recordId },
      data: { status: 'failed' },
    });
  }
}

const PLACEHOLDER_NULL_UUID = '00000000-0000-0000-0000-000000000000';

function fingerprintOf(body: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(body ?? {}))
    .digest('hex');
}
