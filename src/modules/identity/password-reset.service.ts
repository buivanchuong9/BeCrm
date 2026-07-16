import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { AuditService } from '../../common/audit/audit.service';
import { ConflictAppError } from '../../common/errors/app-error';
import { AppConfiguration } from '../../config/configuration';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PasswordService } from './password.service';

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
    private readonly config: ConfigService<AppConfiguration, true>,
  ) {}
  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
  async forgot(email: string, requestId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { memberships: true },
    });
    if (user && user.status === 'active') {
      const raw = randomBytes(32).toString('base64url');
      await this.prisma.$transaction(async (tx) => {
        await tx.passwordResetToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: new Date() },
        });
        await tx.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: this.hash(raw),
            expiresAt: new Date(Date.now() + 30 * 60_000),
          },
        });
        await tx.notification.create({
          data: {
            event: 'password_reset_requested',
            recipientId: user.id,
            recipientRole: user.memberships[0]?.role ?? 'patient',
            channel: 'email',
            message: `${this.config.get('appPublicUrl', { infer: true })}/reset-password?token=${encodeURIComponent(raw)}`,
          },
        });
        await this.audit.write(
          {
            actorId: null,
            action: 'auth.password_reset_requested',
            resourceType: 'user',
            resourceId: user.id,
            result: 'success',
            requestId: requestId ?? null,
          },
          tx,
        );
      });
    }
    return { data: { accepted: true } };
  }
  async reset(token: string, newPassword: string, requestId?: string) {
    this.passwords.assertAcceptablePassword(newPassword);
    const hash = this.hash(token);
    const row = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: hash } });
    if (!row || row.usedAt || row.expiresAt <= new Date())
      throw new ConflictAppError('AUTH_RESET_TOKEN_INVALID', 'Reset token is invalid or expired.');
    const passwordHash = await this.passwords.hash(newPassword);
    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: row.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (!consumed.count)
        throw new ConflictAppError(
          'AUTH_RESET_TOKEN_INVALID',
          'Reset token is invalid or expired.',
        );
      await tx.user.update({
        where: { id: row.userId },
        data: { passwordHash, failedLoginCount: 0, lockedUntil: null, version: { increment: 1 } },
      });
      await tx.refreshSession.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'password_reset' },
      });
      await this.audit.write(
        {
          actorId: row.userId,
          action: 'auth.password_reset_completed',
          resourceType: 'user',
          resourceId: row.userId,
          result: 'success',
          requestId: requestId ?? null,
        },
        tx,
      );
    });
  }
}
