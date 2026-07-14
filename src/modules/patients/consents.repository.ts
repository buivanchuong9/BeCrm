import { Injectable } from '@nestjs/common';
import { Consent, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ConflictAppError } from '../../common/errors/app-error';

export const KNOWN_CONSENT_TYPES = [
  'data_processing',
  'research_data_sharing',
  'telemedicine',
] as const;
export type ConsentType = (typeof KNOWN_CONSENT_TYPES)[number];

@Injectable()
export class ConsentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByPatientId(patientId: string, type?: string): Promise<Consent[]> {
    return this.prisma.consent.findMany({
      where: { patientId, ...(type ? { type } : {}) },
      orderBy: { type: 'asc' },
    });
  }

  findCurrent(patientId: string, type: ConsentType): Promise<Consent | null> {
    return this.prisma.consent.findUnique({ where: { patientId_type: { patientId, type } } });
  }

  /**
   * Grant is append-only at the event layer and idempotent at the projection
   * layer: creates the current-state row on first grant, or flips an existing
   * row back to granted=true. Must run inside the same transaction as the
   * ConsentEvent insert and the audit/outbox writes (caller's responsibility).
   */
  async grant(
    tx: Prisma.TransactionClient,
    patientId: string,
    type: ConsentType,
    policyVersion: string,
    grantedAt: Date,
  ): Promise<Consent> {
    return tx.consent.upsert({
      where: { patientId_type: { patientId, type } },
      create: { patientId, type, policyVersion, granted: true, grantedAt },
      update: {
        granted: true,
        grantedAt,
        policyVersion,
        withdrawnAt: null,
        version: { increment: 1 },
      },
    });
  }

  async withdraw(
    tx: Prisma.TransactionClient,
    consentId: string,
    expectedVersion: number,
    withdrawnAt: Date,
  ): Promise<Consent> {
    const result = await tx.consent.updateMany({
      where: { id: consentId, version: expectedVersion },
      data: { granted: false, withdrawnAt, version: { increment: 1 } },
    });
    if (result.count === 0) {
      throw new ConflictAppError(
        'OPTIMISTIC_LOCK_FAILED',
        'Consent was modified by another request.',
      );
    }
    return tx.consent.findUniqueOrThrow({ where: { id: consentId } });
  }

  writeEvent(
    tx: Prisma.TransactionClient,
    input: {
      consentId: string;
      patientId: string;
      type: string;
      action: 'granted' | 'withdrawn';
      policyVersion: string;
      actorId: string;
      reason?: string | null;
    },
  ) {
    return tx.consentEvent.create({
      data: {
        consentId: input.consentId,
        patientId: input.patientId,
        type: input.type,
        action: input.action,
        policyVersion: input.policyVersion,
        actorId: input.actorId,
        reason: input.reason ?? null,
      },
    });
  }
}
