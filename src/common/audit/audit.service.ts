import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface AuditWriteInput {
  actorId: string | null;
  actorRoleSnapshot?: string | null;
  actorNameSnapshot?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  patientId?: string | null;
  organizationId?: string | null;
  clinicLocationId?: string | null;
  requestId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  result: 'success' | 'denied' | 'error';
  reason?: string | null;
  changedFields?: string[] | null;
  beforeRedacted?: Prisma.InputJsonValue | null;
  afterRedacted?: Prisma.InputJsonValue | null;
  breakGlass?: boolean;
}

/**
 * Audit rows are append-only (DB trigger in migration 0002 rejects UPDATE/DELETE).
 * `write` accepts an optional transaction client so a sensitive command can insert
 * its audit row atomically with the state change it is recording.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: AuditWriteInput, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.auditEvent.create({
      data: {
        actorId: input.actorId,
        actorRoleSnap: input.actorRoleSnapshot ?? null,
        actorNameSnap: input.actorNameSnapshot ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        patientId: input.patientId ?? null,
        organizationId: input.organizationId ?? null,
        clinicLocationId: input.clinicLocationId ?? null,
        requestId: input.requestId ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        result: input.result,
        reason: input.reason ?? null,
        changedFields: input.changedFields ?? Prisma.JsonNull,
        beforeRedacted: input.beforeRedacted ?? Prisma.JsonNull,
        afterRedacted: input.afterRedacted ?? Prisma.JsonNull,
        breakGlass: input.breakGlass ?? false,
      },
    });
  }
}
