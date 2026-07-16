import { Injectable } from '@nestjs/common';
import { AppointmentCheckInToken, Prisma } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../infrastructure/database/prisma.service';

/** docs/api.md section 21 / section 40 SEC-09: server-random 256-bit token,
 * only the SHA-256 hash is ever persisted — replaces the frontend prototype's
 * client-side FNV-1a "signing" scheme (hardcoded SIGNING_KEY, guessable). */
export function generateRawToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

@Injectable()
export class CheckInTokensRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Auto-replaces any existing active token for the appointment before
   * creating the new one (docs/api.md APT-7 — confirmed frontend behavior),
   * inside the caller's transaction. */
  async issue(
    tx: Prisma.TransactionClient,
    input: {
      appointmentId: string;
      patientId: string;
      clinicLocationId: string;
      validFrom: Date;
      expiresAt: Date;
    },
  ): Promise<{ record: AppointmentCheckInToken; rawToken: string }> {
    await tx.appointmentCheckInToken.updateMany({
      where: { appointmentId: input.appointmentId, status: 'active' },
      data: { status: 'replaced', revokedAt: new Date(), revokedReason: 'Replaced by a new token' },
    });
    const rawToken = generateRawToken();
    const record = await tx.appointmentCheckInToken.create({
      data: {
        appointmentId: input.appointmentId,
        patientId: input.patientId,
        clinicLocationId: input.clinicLocationId,
        tokenHash: hashToken(rawToken),
        validFrom: input.validFrom,
        expiresAt: input.expiresAt,
      },
    });
    return { record, rawToken };
  }

  findActiveByAppointmentId(appointmentId: string): Promise<AppointmentCheckInToken | null> {
    return this.prisma.appointmentCheckInToken.findFirst({
      where: { appointmentId, status: 'active' },
    });
  }

  findByHash(tokenHash: string): Promise<AppointmentCheckInToken | null> {
    return this.prisma.appointmentCheckInToken.findUnique({ where: { tokenHash } });
  }

  async revokeActive(
    tx: Prisma.TransactionClient,
    appointmentId: string,
    reason: string,
  ): Promise<Prisma.BatchPayload> {
    return tx.appointmentCheckInToken.updateMany({
      where: { appointmentId, status: 'active' },
      data: { status: 'revoked', revokedAt: new Date(), revokedReason: reason },
    });
  }

  markUsed(
    tx: Prisma.TransactionClient,
    tokenId: string,
    expectedVersion: number,
    deviceId: string | null,
  ) {
    return tx.appointmentCheckInToken.updateMany({
      where: { id: tokenId, version: expectedVersion, status: 'active' },
      data: {
        status: 'used',
        usedAt: new Date(),
        usedByDeviceId: deviceId,
        version: { increment: 1 },
      },
    });
  }
}
