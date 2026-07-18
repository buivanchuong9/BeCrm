import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuditService } from '../../../common/audit/audit.service';
import {
  ConflictAppError,
  ForbiddenAppError,
  NotFoundAppError,
} from '../../../common/errors/app-error';
import { AppConfiguration } from '../../../config/configuration';
import { decryptMfaSecret, encryptMfaSecret } from './mfa-crypto.util';
import { buildOtpAuthUri, generateBase32Secret, verifyTotp } from './totp.util';

export interface RequestContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

/**
 * TOTP (RFC 6238) MFA — the permission model requires each of the 4 platform
 * Owners to carry "MFA riêng" (their own, independent MFA), and break-glass
 * access explicitly gates on a live MFA verification step. Any user may
 * enroll; only Owners are ever *required* to have it (enforced at the
 * break-glass/dangerous-action call sites, not here).
 */
@Injectable()
export class MfaService {
  private readonly fieldEncryptionKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    config: ConfigService<AppConfiguration, true>,
  ) {
    this.fieldEncryptionKey = config.get('auth', { infer: true }).fieldEncryptionKey;
  }

  /** Step 1: generate a secret and return it (+ otpauth:// URI for a QR
   * code) but do NOT enable MFA yet — `confirmEnrollment` must prove the
   * user actually captured it correctly before it takes effect. */
  async beginEnrollment(userId: string, email: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundAppError('User not found.');
    if (user.mfaEnabled) {
      throw new ConflictAppError('MFA_ALREADY_ENABLED', 'MFA is already enabled on this account.');
    }
    const secret = generateBase32Secret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecretEnc: encryptMfaSecret(secret, this.fieldEncryptionKey) },
    });
    return {
      secret,
      otpAuthUri: buildOtpAuthUri({ secret, accountEmail: email, issuer: 'DermaHealth' }),
    };
  }

  async confirmEnrollment(userId: string, code: string, context: RequestContext): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundAppError('User not found.');
    if (user.mfaEnabled) {
      throw new ConflictAppError('MFA_ALREADY_ENABLED', 'MFA is already enabled on this account.');
    }
    if (!user.mfaSecretEnc) {
      throw new ConflictAppError(
        'MFA_ENROLLMENT_NOT_STARTED',
        'Call the enrollment endpoint first.',
      );
    }
    const secret = decryptMfaSecret(user.mfaSecretEnc, this.fieldEncryptionKey);
    if (!verifyTotp(secret, code)) {
      throw new ConflictAppError('MFA_INVALID_CODE', 'Invalid verification code.');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true, version: { increment: 1 } },
    });
    await this.audit.write({
      actorId: userId,
      action: 'auth.mfa_enabled',
      resourceType: 'user',
      resourceId: userId,
      result: 'success',
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });
  }

  async disable(userId: string, code: string, context: RequestContext): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundAppError('User not found.');
    if (!user.mfaEnabled || !user.mfaSecretEnc) {
      throw new ConflictAppError('MFA_NOT_ENABLED', 'MFA is not enabled on this account.');
    }
    const secret = decryptMfaSecret(user.mfaSecretEnc, this.fieldEncryptionKey);
    if (!verifyTotp(secret, code)) {
      throw new ConflictAppError('MFA_INVALID_CODE', 'Invalid verification code.');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecretEnc: null, version: { increment: 1 } },
    });
    await this.audit.write({
      actorId: userId,
      action: 'auth.mfa_disabled',
      resourceType: 'user',
      resourceId: userId,
      result: 'success',
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });
  }

  /** Used by BreakGlassService / DangerousActionsService to gate a
   * sensitive action on a live TOTP code without exposing the secret to the
   * caller. Throws MFA_NOT_ENABLED rather than silently passing — an Owner
   * without MFA enrolled cannot use break-glass or approve a dangerous
   * action at all. */
  async assertValidCode(userId: string, code: string | undefined): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaEnabled || !user.mfaSecretEnc) {
      throw new ForbiddenAppError(
        'MFA_NOT_ENABLED',
        'MFA must be enabled on this account before performing this action.',
      );
    }
    if (!code || !verifyTotp(decryptMfaSecret(user.mfaSecretEnc, this.fieldEncryptionKey), code)) {
      throw new ForbiddenAppError('MFA_INVALID_CODE', 'Invalid or missing MFA code.');
    }
  }
}
