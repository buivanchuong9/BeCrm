import { Injectable } from '@nestjs/common';
import { UnauthorizedAppError } from '../../common/errors/app-error';
import { AuditService } from '../../common/audit/audit.service';
import { PasswordService } from './password.service';
import { TokenService, hashRefreshToken } from './token.service';
import { UsersRepository, UserWithMemberships } from './users.repository';
import { RefreshSessionsRepository, DeviceContext } from './refresh-sessions.repository';

const FAILED_LOGIN_LOCK_THRESHOLD = 5;
const FAILED_LOGIN_LOCK_MINUTES = 15;

export interface LoginResult {
  accessToken: string;
  accessTokenExpiresInSeconds: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: UserWithMemberships;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly refreshSessions: RefreshSessionsRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly audit: AuditService,
  ) {}

  async login(
    email: string,
    password: string,
    remember: boolean,
    context: DeviceContext & { requestId?: string },
  ): Promise<LoginResult> {
    const user = await this.users.findByEmailWithMemberships(email.toLowerCase());

    // Generic error for unknown email, wrong password, or non-active status — never
    // reveal which case occurred (spec section 28: "Login uses generic error").
    if (!user || !user.passwordHash || user.status !== 'active') {
      await this.audit.write({
        actorId: user?.id ?? null,
        action: 'auth.login.failed',
        resourceType: 'user',
        resourceId: user?.id ?? null,
        result: 'denied',
        ip: context.ip ?? null,
        userAgent: context.userAgent ?? null,
        requestId: context.requestId ?? null,
      });
      throw new UnauthorizedAppError('AUTH_INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new UnauthorizedAppError(
        'AUTH_ACCOUNT_LOCKED',
        'Account temporarily locked. Try again later.',
      );
    }

    const passwordValid = await this.passwordService.verify(user.passwordHash, password);
    if (!passwordValid) {
      await this.users.registerFailedLogin(
        user.id,
        FAILED_LOGIN_LOCK_THRESHOLD,
        FAILED_LOGIN_LOCK_MINUTES,
      );
      await this.audit.write({
        actorId: user.id,
        action: 'auth.login.failed',
        resourceType: 'user',
        resourceId: user.id,
        result: 'denied',
        ip: context.ip ?? null,
        userAgent: context.userAgent ?? null,
        requestId: context.requestId ?? null,
      });
      throw new UnauthorizedAppError('AUTH_INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    await this.users.resetFailedLogin(user.id);

    const memberships = this.users.toMembershipScopes(user);
    const accessToken = this.tokenService.signAccessToken(
      user.id,
      user.email,
      user.displayName,
      memberships,
    );
    const refreshToken = this.tokenService.issueRefreshToken(remember);
    await this.refreshSessions.createFamily(user.id, refreshToken, context);

    await this.audit.write({
      actorId: user.id,
      action: 'auth.login.success',
      resourceType: 'user',
      resourceId: user.id,
      result: 'success',
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
      requestId: context.requestId ?? null,
    });

    return {
      accessToken: accessToken.token,
      accessTokenExpiresInSeconds: accessToken.expiresInSeconds,
      refreshToken: refreshToken.rawToken,
      refreshTokenExpiresAt: refreshToken.expiresAt,
      user,
    };
  }

  async refresh(
    rawRefreshToken: string,
    remember: boolean,
    context: DeviceContext & { requestId?: string },
  ): Promise<LoginResult> {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const session = await this.refreshSessions.findByTokenHash(tokenHash);

    if (!session) {
      throw new UnauthorizedAppError(
        'AUTH_SESSION_EXPIRED',
        'Session expired. Please log in again.',
      );
    }

    if (session.revokedAt) {
      // Reuse of an already-rotated/revoked token: the whole family is compromised.
      await this.refreshSessions.revokeFamily(session.familyId, 'reuse_detected');
      await this.audit.write({
        actorId: session.userId,
        action: 'auth.refresh.reuse_detected',
        resourceType: 'refresh_session',
        resourceId: session.id,
        result: 'denied',
        ip: context.ip ?? null,
        userAgent: context.userAgent ?? null,
        requestId: context.requestId ?? null,
      });
      throw new UnauthorizedAppError(
        'AUTH_REFRESH_REUSED',
        'Session invalidated. Please log in again.',
      );
    }

    if (session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedAppError(
        'AUTH_SESSION_EXPIRED',
        'Session expired. Please log in again.',
      );
    }

    const user = await this.users.findByIdWithMemberships(session.userId);
    if (!user || user.status !== 'active') {
      await this.refreshSessions.revoke(session.id, 'user_inactive');
      throw new UnauthorizedAppError(
        'AUTH_SESSION_EXPIRED',
        'Session expired. Please log in again.',
      );
    }

    const memberships = this.users.toMembershipScopes(user);
    const accessToken = this.tokenService.signAccessToken(
      user.id,
      user.email,
      user.displayName,
      memberships,
    );
    const newRefreshToken = this.tokenService.issueRefreshToken(remember);
    const newSession = await this.refreshSessions.createInFamily(
      user.id,
      session.familyId,
      newRefreshToken,
      context,
    );
    await this.refreshSessions.markRotated(session.id, newSession.id);

    return {
      accessToken: accessToken.token,
      accessTokenExpiresInSeconds: accessToken.expiresInSeconds,
      refreshToken: newRefreshToken.rawToken,
      refreshTokenExpiresAt: newRefreshToken.expiresAt,
      user,
    };
  }

  async logout(rawRefreshToken: string, allDevices: boolean, requestId?: string): Promise<void> {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const session = await this.refreshSessions.findByTokenHash(tokenHash);
    if (!session) {
      return;
    }
    if (allDevices) {
      await this.refreshSessions.revokeFamily(session.familyId, 'logout_all');
    } else if (!session.revokedAt) {
      await this.refreshSessions.revoke(session.id, 'logout');
    }
    await this.audit.write({
      actorId: session.userId,
      action: allDevices ? 'auth.logout_all' : 'auth.logout',
      resourceType: 'refresh_session',
      resourceId: session.id,
      result: 'success',
      requestId: requestId ?? null,
    });
  }

  /** Used only by DELETE /auth/sessions' optional password re-confirmation. */
  async findSessionOwnerPasswordHash(rawRefreshToken: string): Promise<string | null> {
    const session = await this.refreshSessions.findByTokenHash(hashRefreshToken(rawRefreshToken));
    if (!session) return null;
    const user = await this.users.findByIdWithMemberships(session.userId);
    return user?.passwordHash ?? null;
  }
}
