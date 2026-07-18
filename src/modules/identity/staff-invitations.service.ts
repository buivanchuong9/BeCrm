import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuthenticatedPrincipal } from '../../common/auth/auth.types';
import { ConflictAppError, ForbiddenAppError } from '../../common/errors/app-error';
import { AppConfiguration } from '../../config/configuration';
import { PasswordService } from './password.service';
import { InviteStaffRequest } from './dto/invite-staff.dto';

export interface RequestContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

const INVITATION_TTL_MS = 7 * 24 * 60 * 60_000;

/**
 * The single non-self-service account-creation path (permission model box 1,
 * right side: "Bác sĩ / Điều dưỡng / Nhân viên" ← "Platform Owner gửi lời
 * mời" — email + role + clinic + department, invitee activates). Patient
 * self-registration (`POST /auth/registrations`) is the only other
 * account-creation entry point. Notably absent from `INVITABLE_ROLES`:
 * `patient` (self-register only) and `super_administrator` (adding an Owner
 * is a `dangerous: true` action — see DangerousActionsService's `add_owner`
 * type — precisely so a single compromised/careless Owner account can never
 * mint a second one unilaterally).
 *
 * No mailer is wired up yet in this backend (SMTP config exists but nothing
 * consumes it) — like AppointmentCheckInToken, the raw activation token is
 * returned once, here, to the inviting caller, who is responsible for
 * relaying it out-of-band until a real mail dispatcher exists.
 */
@Injectable()
export class StaffInvitationsService {
  private readonly appPublicUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly audit: AuditService,
    config: ConfigService<AppConfiguration, true>,
  ) {
    this.appPublicUrl = config.get('appPublicUrl', { infer: true });
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async invite(
    principal: AuthenticatedPrincipal,
    dto: InviteStaffRequest,
    context: RequestContext,
  ) {
    const callerInOrg = principal.memberships.some(
      (m) => m.organizationId === dto.organizationId || m.role === 'super_administrator',
    );
    if (!callerInOrg) {
      throw new ForbiddenAppError('CLINIC_SCOPE_DENIED', 'No membership in this organization.');
    }

    const email = dto.email.toLowerCase();
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictAppError('CONFLICT', 'An account with this email already exists.');
    }
    const existingInvitation = await this.prisma.staffInvitation.findFirst({
      where: { email, status: 'pending', expiresAt: { gt: new Date() } },
    });
    if (existingInvitation) {
      throw new ConflictAppError('CONFLICT', 'An invitation is already pending for this email.');
    }

    const raw = randomBytes(32).toString('base64url');
    const invitation = await this.prisma.staffInvitation.create({
      data: {
        email,
        displayName: dto.displayName,
        role: dto.role,
        organizationId: dto.organizationId,
        clinicLocationId: dto.clinicLocationId ?? null,
        departmentId: dto.departmentId ?? null,
        invitedBy: principal.userId,
        tokenHash: this.hash(raw),
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      },
    });

    await this.audit.write({
      actorId: principal.userId,
      action: 'staff_invitation.created',
      resourceType: 'staff_invitation',
      resourceId: invitation.id,
      organizationId: dto.organizationId,
      result: 'success',
      afterRedacted: { email, role: dto.role },
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });

    return {
      invitationId: invitation.id,
      email: invitation.email,
      displayName: invitation.displayName,
      role: invitation.role,
      expiresAt: invitation.expiresAt.toISOString(),
      activationUrl: `${this.appPublicUrl}/activate-account?token=${encodeURIComponent(raw)}`,
    };
  }

  /** Trusted path used ONLY by DangerousActionsService after a 2-of-4 Owner
   * quorum executes an `add_owner` request — deliberately bypasses the
   * INVITABLE_ROLES restriction that blocks `super_administrator` from the
   * public `POST /users` endpoint. Never call this directly from a
   * controller. */
  async inviteOwner(
    email: string,
    displayName: string,
    organizationId: string,
    invitedBy: string,
    context: RequestContext,
  ) {
    const normalizedEmail = email.toLowerCase();
    const existingUser = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      throw new ConflictAppError('CONFLICT', 'An account with this email already exists.');
    }
    const raw = randomBytes(32).toString('base64url');
    const invitation = await this.prisma.staffInvitation.create({
      data: {
        email: normalizedEmail,
        displayName,
        role: 'super_administrator',
        organizationId,
        invitedBy,
        tokenHash: this.hash(raw),
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      },
    });
    await this.audit.write({
      actorId: invitedBy,
      action: 'staff_invitation.owner_created',
      resourceType: 'staff_invitation',
      resourceId: invitation.id,
      organizationId,
      result: 'success',
      afterRedacted: { email: normalizedEmail },
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });
    return {
      invitationId: invitation.id,
      email: invitation.email,
      activationUrl: `${this.appPublicUrl}/activate-account?token=${encodeURIComponent(raw)}`,
    };
  }

  async listPending(organizationId: string) {
    return this.prisma.staffInvitation.findMany({
      where: { organizationId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(principal: AuthenticatedPrincipal, invitationId: string, context: RequestContext) {
    const invitation = await this.prisma.staffInvitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation || invitation.status !== 'pending') {
      throw new ConflictAppError('CONFLICT', 'Invitation is not pending.');
    }
    const callerInOrg = principal.memberships.some(
      (m) => m.organizationId === invitation.organizationId || m.role === 'super_administrator',
    );
    if (!callerInOrg) {
      throw new ForbiddenAppError('CLINIC_SCOPE_DENIED', 'No membership in this organization.');
    }
    await this.prisma.staffInvitation.update({
      where: { id: invitationId },
      data: { status: 'revoked' },
    });
    await this.audit.write({
      actorId: principal.userId,
      action: 'staff_invitation.revoked',
      resourceType: 'staff_invitation',
      resourceId: invitationId,
      organizationId: invitation.organizationId,
      result: 'success',
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });
  }

  /** Public: the invitee sets their password to activate. No auto-login
   * (unlike patient self-registration) — the invitee logs in normally
   * afterward via `POST /auth/sessions`, same as any other account. */
  async activate(token: string, password: string, context: RequestContext): Promise<void> {
    this.passwordService.assertAcceptablePassword(password);
    const tokenHash = this.hash(token);
    const invitation = await this.prisma.staffInvitation.findUnique({ where: { tokenHash } });
    if (!invitation || invitation.status !== 'pending' || invitation.expiresAt <= new Date()) {
      throw new ConflictAppError('INVITATION_TOKEN_INVALID', 'Invitation is invalid or expired.');
    }
    const passwordHash = await this.passwordService.hash(password);

    try {
      await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const consumed = await tx.staffInvitation.updateMany({
          where: { id: invitation.id, status: 'pending' },
          data: { status: 'accepted', acceptedAt: new Date() },
        });
        if (!consumed.count) {
          throw new ConflictAppError(
            'INVITATION_TOKEN_INVALID',
            'Invitation is invalid or expired.',
          );
        }
        const user = await tx.user.create({
          data: {
            email: invitation.email,
            displayName: invitation.displayName,
            passwordHash,
            status: 'active',
            emailVerifiedAt: new Date(),
          },
        });
        await tx.staffInvitation.update({
          where: { id: invitation.id },
          data: { userId: user.id },
        });
        await tx.userMembership.create({
          data: {
            userId: user.id,
            organizationId: invitation.organizationId,
            clinicLocationId: invitation.clinicLocationId,
            departmentId: invitation.departmentId,
            role: invitation.role,
            status: 'active',
          },
        });
        await this.audit.write(
          {
            actorId: user.id,
            action: 'staff_invitation.accepted',
            resourceType: 'user',
            resourceId: user.id,
            organizationId: invitation.organizationId,
            result: 'success',
            requestId: context.requestId ?? null,
            ip: context.ip ?? null,
            userAgent: context.userAgent ?? null,
          },
          tx,
        );
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictAppError('CONFLICT', 'An account with this email already exists.');
      }
      throw err;
    }
  }
}
