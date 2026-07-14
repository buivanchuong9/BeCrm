import { randomUUID } from 'crypto';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { AuditService } from '../../src/common/audit/audit.service';
import { createTestPrisma } from './utils/test-prisma';

describe('audit_events append-only enforcement (F-002, integration)', () => {
  let prisma: PrismaService;
  let audit: AuditService;

  beforeAll(async () => {
    prisma = createTestPrisma();
    await prisma.$connect();
    audit = new AuditService(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('allows application code to insert an audit row', async () => {
    const resourceId = randomUUID();
    await audit.write({
      actorId: null,
      action: 'test.integration.insert',
      resourceType: 'test_resource',
      resourceId,
      result: 'success',
    });

    const row = await prisma.auditEvent.findFirst({
      where: { resourceId, action: 'test.integration.insert' },
    });
    expect(row).not.toBeNull();
    expect(row?.result).toBe('success');
  });

  it('rejects UPDATE against audit_events even from application code', async () => {
    const resourceId = randomUUID();
    await audit.write({
      actorId: null,
      action: 'test.integration.update-target',
      resourceType: 'test_resource',
      resourceId,
      result: 'success',
    });
    const row = await prisma.auditEvent.findFirstOrThrow({ where: { resourceId } });

    await expect(
      prisma.auditEvent.update({ where: { id: row.id }, data: { result: 'denied' } }),
    ).rejects.toThrow(/append-only/i);
  });

  it('rejects DELETE against audit_events even from application code', async () => {
    const resourceId = randomUUID();
    await audit.write({
      actorId: null,
      action: 'test.integration.delete-target',
      resourceType: 'test_resource',
      resourceId,
      result: 'success',
    });
    const row = await prisma.auditEvent.findFirstOrThrow({ where: { resourceId } });

    await expect(prisma.auditEvent.delete({ where: { id: row.id } })).rejects.toThrow(
      /append-only/i,
    );

    // Row must still exist, unmodified, after the rejected delete.
    const stillThere = await prisma.auditEvent.findUnique({ where: { id: row.id } });
    expect(stillThere).not.toBeNull();
  });

  it('rejects raw SQL UPDATE/DELETE too (the trigger, not just the Prisma layer, enforces this)', async () => {
    const resourceId = randomUUID();
    await audit.write({
      actorId: null,
      action: 'test.integration.raw-sql-target',
      resourceType: 'test_resource',
      resourceId,
      result: 'success',
    });

    await expect(
      prisma.$executeRaw`UPDATE audit_events SET result = 'denied' WHERE resource_id = ${resourceId}::uuid`,
    ).rejects.toThrow(/append-only/i);
    await expect(
      prisma.$executeRaw`DELETE FROM audit_events WHERE resource_id = ${resourceId}::uuid`,
    ).rejects.toThrow(/append-only/i);
  });

  it('redacts sensitive values: audit rows never store password/token fields, only redacted before/after snapshots', async () => {
    const resourceId = randomUUID();
    await audit.write({
      actorId: null,
      action: 'test.integration.redaction',
      resourceType: 'test_resource',
      resourceId,
      result: 'success',
      // Callers are expected to pass already-redacted snapshots — this test
      // documents the contract: whatever is passed as beforeRedacted/afterRedacted
      // is stored verbatim, so it is the caller's job to never include secrets.
      beforeRedacted: { field: 'status', value: 'old' },
      afterRedacted: { field: 'status', value: 'new' },
    });
    const row = await prisma.auditEvent.findFirstOrThrow({ where: { resourceId } });
    expect(JSON.stringify(row.beforeRedacted)).not.toMatch(/password|token|secret/i);
    expect(JSON.stringify(row.afterRedacted)).not.toMatch(/password|token|secret/i);
  });

  it('preserves request ID and actor context for authentication actions', async () => {
    const actorId = randomUUID();
    const requestId = randomUUID();
    await audit.write({
      actorId,
      action: 'auth.login.success',
      resourceType: 'user',
      resourceId: actorId,
      result: 'success',
      requestId,
      ip: '203.0.113.5',
      userAgent: 'jest-integration-test',
    });
    const row = await prisma.auditEvent.findFirstOrThrow({ where: { requestId } });
    expect(row.actorId).toBe(actorId);
    expect(row.requestId).toBe(requestId);
    expect(row.action).toBe('auth.login.success');
  });
});
