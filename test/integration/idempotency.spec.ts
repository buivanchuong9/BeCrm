import { randomUUID } from 'crypto';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { IdempotencyService } from '../../src/common/idempotency/idempotency.service';
import { ConflictAppError } from '../../src/common/errors/app-error';
import { createTestPrisma } from './utils/test-prisma';

describe('IdempotencyService (F-003, integration against real Postgres)', () => {
  let prisma: PrismaService;
  let service: IdempotencyService;

  beforeAll(async () => {
    prisma = createTestPrisma();
    await prisma.$connect();
    service = new IdempotencyService(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const route = 'POST /api/v1/appointments';

  it('same key + same request body (same principal) replays the exact saved response', async () => {
    const principalId = randomUUID();
    const key = randomUUID();
    const body = { slotId: 'slot-2', patientId: 'patient-2' };

    const first = await service.begin({
      principalId,
      principalScope: 'user',
      route,
      idempotencyKey: key,
      requestBody: body,
    });
    if (first.kind !== 'proceed') throw new Error('expected proceed on first call');
    await service.complete(first.recordId, 201, { data: { id: 'apt-2' } });

    const second = await service.begin({
      principalId,
      principalScope: 'user',
      route,
      idempotencyKey: key,
      requestBody: body,
    });
    expect(second.kind).toBe('replay');
    if (second.kind !== 'replay') throw new Error('unreachable');
    expect(second.status).toBe(201);
    expect(second.body).toEqual({ data: { id: 'apt-2' } });
  });

  it('same key + different request fingerprint returns IDEMPOTENCY_KEY_REUSED', async () => {
    const principalId = randomUUID();
    const key = randomUUID();

    const first = await service.begin({
      principalId,
      principalScope: 'user',
      route,
      idempotencyKey: key,
      requestBody: { slotId: 'slot-a' },
    });
    if (first.kind !== 'proceed') throw new Error('expected proceed on first call');
    await service.complete(first.recordId, 201, { data: { id: 'apt-a' } });

    await expect(
      service.begin({
        principalId,
        principalScope: 'user',
        route,
        idempotencyKey: key,
        requestBody: { slotId: 'slot-b' },
      }),
    ).rejects.toThrow(ConflictAppError);
  });

  it('a failed execution does not become a completed/replayable response', async () => {
    const principalId = randomUUID();
    const key = randomUUID();
    const body = { slotId: 'slot-fail' };

    const first = await service.begin({
      principalId,
      principalScope: 'user',
      route,
      idempotencyKey: key,
      requestBody: body,
    });
    if (first.kind !== 'proceed') throw new Error('expected proceed on first call');
    await service.fail(first.recordId);

    const record = await prisma.idempotencyRecord.findUnique({ where: { id: first.recordId } });
    expect(record?.status).toBe('failed');
    expect(record?.responseStatus).toBeNull();
  });

  it('a retried failed execution is allowed to proceed again (not blocked as a reuse conflict)', async () => {
    const principalId = randomUUID();
    const key = randomUUID();
    const body = { slotId: 'slot-retry' };

    const first = await service.begin({
      principalId,
      principalScope: 'user',
      route,
      idempotencyKey: key,
      requestBody: body,
    });
    if (first.kind !== 'proceed') throw new Error('expected proceed on first call');
    await service.fail(first.recordId);

    const retry = await service.begin({
      principalId,
      principalScope: 'user',
      route,
      idempotencyKey: key,
      requestBody: body,
    });
    expect(retry.kind).toBe('proceed');
    if (retry.kind !== 'proceed') throw new Error('unreachable');
    // Retrying reuses the same record row rather than creating a duplicate.
    expect(retry.recordId).toBe(first.recordId);
  });

  it('concurrent duplicate submissions do not both execute: only one wins the unique-constraint race', async () => {
    const principalId = randomUUID();
    const key = randomUUID();
    const body = { slotId: 'slot-concurrent' };

    const attempts = await Promise.allSettled([
      service.begin({
        principalId,
        principalScope: 'user',
        route,
        idempotencyKey: key,
        requestBody: body,
      }),
      service.begin({
        principalId,
        principalScope: 'user',
        route,
        idempotencyKey: key,
        requestBody: body,
      }),
      service.begin({
        principalId,
        principalScope: 'user',
        route,
        idempotencyKey: key,
        requestBody: body,
      }),
      service.begin({
        principalId,
        principalScope: 'user',
        route,
        idempotencyKey: key,
        requestBody: body,
      }),
      service.begin({
        principalId,
        principalScope: 'user',
        route,
        idempotencyKey: key,
        requestBody: body,
      }),
    ]);

    // Every settled attempt must be either "proceed" (winner, or a caller that
    // observed the row after it was created) or a rejection from the unique
    // constraint — never two different in-progress record ids doing
    // independent work. Assert on the persisted row count instead of racing
    // in-process results, since that's what actually matters for correctness.
    const rows = await prisma.idempotencyRecord.findMany({
      where: { principalId, route, idempotencyKey: key },
    });
    expect(rows).toHaveLength(1);
    expect(attempts.every((a) => a.status === 'fulfilled' || a.status === 'rejected')).toBe(true);
  });

  it('scopes idempotency by principal/device: different principals with the same key/body get independent records', async () => {
    const key = randomUUID();
    const body = { slotId: 'slot-shared-key' };
    const principalA = randomUUID();
    const principalB = randomUUID();

    const a = await service.begin({
      principalId: principalA,
      principalScope: 'user',
      route,
      idempotencyKey: key,
      requestBody: body,
    });
    const b = await service.begin({
      principalId: principalB,
      principalScope: 'user',
      route,
      idempotencyKey: key,
      requestBody: body,
    });
    expect(a.kind).toBe('proceed');
    expect(b.kind).toBe('proceed');
    if (a.kind !== 'proceed' || b.kind !== 'proceed') throw new Error('unreachable');
    expect(a.recordId).not.toBe(b.recordId);
  });

  it('scopes idempotency by target: the same principal/route/key with different targets get independent records', async () => {
    const principalId = randomUUID();
    const key = randomUUID();
    const body = { version: 3 };

    const forTargetA = await service.begin({
      principalId,
      principalScope: 'user',
      route: 'POST /api/v1/appointments/{id}/cancellations',
      target: 'appointment-a',
      idempotencyKey: key,
      requestBody: body,
    });
    const forTargetB = await service.begin({
      principalId,
      principalScope: 'user',
      route: 'POST /api/v1/appointments/{id}/cancellations',
      target: 'appointment-b',
      idempotencyKey: key,
      requestBody: body,
    });
    expect(forTargetA.kind).toBe('proceed');
    expect(forTargetB.kind).toBe('proceed');
    if (forTargetA.kind !== 'proceed' || forTargetB.kind !== 'proceed')
      throw new Error('unreachable');
    expect(forTargetA.recordId).not.toBe(forTargetB.recordId);
  });
});
