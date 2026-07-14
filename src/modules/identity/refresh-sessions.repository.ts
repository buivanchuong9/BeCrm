import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { IssuedRefreshToken } from './token.service';

export interface DeviceContext {
  deviceLabel?: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class RefreshSessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createFamily(userId: string, issued: IssuedRefreshToken, context: DeviceContext) {
    return this.prisma.refreshSession.create({
      data: {
        userId,
        familyId: randomUUID(),
        tokenHash: issued.tokenHash,
        expiresAt: issued.expiresAt,
        deviceLabel: context.deviceLabel,
        ip: context.ip,
        userAgent: context.userAgent,
      },
    });
  }

  createInFamily(
    userId: string,
    familyId: string,
    issued: IssuedRefreshToken,
    context: DeviceContext,
  ) {
    return this.prisma.refreshSession.create({
      data: {
        userId,
        familyId,
        tokenHash: issued.tokenHash,
        expiresAt: issued.expiresAt,
        deviceLabel: context.deviceLabel,
        ip: context.ip,
        userAgent: context.userAgent,
      },
    });
  }

  findByTokenHash(tokenHash: string) {
    return this.prisma.refreshSession.findUnique({ where: { tokenHash } });
  }

  markRotated(id: string, replacedById: string) {
    return this.prisma.refreshSession.update({
      where: { id },
      data: { revokedAt: new Date(), revokedReason: 'rotated', replacedById },
    });
  }

  revoke(id: string, reason: string) {
    return this.prisma.refreshSession.update({
      where: { id },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  revokeFamily(familyId: string, reason: string) {
    return this.prisma.refreshSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }
}
