import { Injectable } from '@nestjs/common';
import { DangerousActionType, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import {
  ConflictAppError,
  NotFoundAppError,
  ValidationAppError,
} from '../../core/errors/app-error';
import { MfaService } from '../identity/mfa/mfa.service';
import { StaffInvitationsService } from '../identity/staff-invitations.service';
import {
  ProposeDangerousActionRequest,
  DecideDangerousActionRequest,
} from './dto/owner-governance.dto';

export interface RequestContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

const REQUEST_TTL_MS = 72 * 60 * 60_000;
const MAX_AUDIT_SUSPENSION_MINUTES = 30;

/**
 * Dual-control (2-of-4 Owner quorum) for the platform's most destructive
 * actions — permission model box 2, "Tác vụ cực nguy hiểm: cần 2/4". The
 * proposer's own MFA-verified vote counts as the first approval
 * (`requiredApprovals` defaults to 2), so exactly one more
 * super_administrator must independently approve — each with their own
 * live MFA code — before anything executes. No single Owner account,
 * however compromised, can execute one of these alone.
 *
 * Every propose/approve/reject/execute step is audited under the
 * `dangerous_action.` prefix, which AuditService hard-codes as
 * never-suppressible by the `disable_audit` action this same class exposes.
 */
@Injectable()
export class DangerousActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mfa: MfaService,
    private readonly audit: AuditService,
    private readonly staffInvitations: StaffInvitationsService,
  ) {}

  private validatePayload(type: DangerousActionType, payload: Record<string, unknown>): void {
    const requireString = (field: string) => {
      if (typeof payload[field] !== 'string' || !(payload[field] as string).trim()) {
        throw new ValidationAppError(
          [{ field, code: 'VALIDATION_FAILED' }],
          `"${type}" requires a non-empty "${field}" field in payload.`,
        );
      }
    };
    switch (type) {
      case 'add_owner':
        requireString('email');
        requireString('displayName');
        requireString('organizationId');
        break;
      case 'bulk_directory_export':
      case 'bulk_membership_revoke':
        requireString('organizationId');
        break;
      case 'revoke_all_sessions':
      case 'disable_audit':
        break;
    }
  }

  async propose(
    principal: AuthenticatedPrincipal,
    dto: ProposeDangerousActionRequest,
    context: RequestContext,
  ) {
    await this.mfa.assertValidCode(principal.userId, dto.mfaCode);
    this.validatePayload(dto.type, dto.payload);

    const request = await this.prisma.dangerousActionRequest.create({
      data: {
        type: dto.type,
        payload: dto.payload as Prisma.InputJsonValue,
        reason: dto.reason,
        requestedBy: principal.userId,
        expiresAt: new Date(Date.now() + REQUEST_TTL_MS),
      },
    });
    await this.prisma.dangerousActionApproval.create({
      data: {
        requestId: request.id,
        approverId: principal.userId,
        decision: 'approved',
        reason: 'Proposer auto-approval (MFA-verified at proposal time).',
      },
    });
    await this.audit.write({
      actorId: principal.userId,
      action: 'dangerous_action.proposed',
      resourceType: 'dangerous_action_request',
      resourceId: request.id,
      result: 'success',
      reason: dto.reason,
      afterRedacted: { type: dto.type },
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });
    return this.reload(request.id);
  }

  async decide(
    principal: AuthenticatedPrincipal,
    requestId: string,
    dto: DecideDangerousActionRequest,
    context: RequestContext,
  ) {
    await this.mfa.assertValidCode(principal.userId, dto.mfaCode);

    const request = await this.prisma.dangerousActionRequest.findUnique({
      where: { id: requestId },
      include: { approvals: true },
    });
    if (!request) throw new NotFoundAppError('Dangerous action request not found.');
    if (request.status !== 'pending') {
      throw new ConflictAppError(
        'DANGEROUS_ACTION_ALREADY_DECIDED',
        `This request is already "${request.status}".`,
      );
    }
    if (request.expiresAt <= new Date()) {
      await this.prisma.dangerousActionRequest.update({
        where: { id: requestId },
        data: { status: 'expired' },
      });
      throw new ConflictAppError('DANGEROUS_ACTION_EXPIRED', 'This request has expired.');
    }
    if (request.approvals.some((a) => a.approverId === principal.userId)) {
      throw new ConflictAppError(
        'DANGEROUS_ACTION_DUPLICATE_APPROVAL',
        'You have already voted on this request.',
      );
    }

    await this.prisma.dangerousActionApproval.create({
      data: {
        requestId,
        approverId: principal.userId,
        decision: dto.decision,
        reason: dto.reason ?? null,
      },
    });
    await this.audit.write({
      actorId: principal.userId,
      action: `dangerous_action.${dto.decision}`,
      resourceType: 'dangerous_action_request',
      resourceId: requestId,
      result: 'success',
      reason: dto.reason ?? null,
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });

    if (dto.decision === 'rejected') {
      await this.prisma.dangerousActionRequest.update({
        where: { id: requestId },
        data: { status: 'rejected' },
      });
      return this.reload(requestId);
    }

    const approvedCount = await this.prisma.dangerousActionApproval.count({
      where: { requestId, decision: 'approved' },
    });
    if (approvedCount >= request.requiredApprovals) {
      await this.execute(request, context);
    }
    return this.reload(requestId);
  }

  list() {
    return this.prisma.dangerousActionRequest.findMany({
      include: { approvals: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  private reload(id: string) {
    return this.prisma.dangerousActionRequest.findUniqueOrThrow({
      where: { id },
      include: { approvals: true },
    });
  }

  private async execute(
    request: {
      id: string;
      type: DangerousActionType;
      payload: Prisma.JsonValue;
      requestedBy: string;
    },
    context: RequestContext,
  ): Promise<void> {
    const payload = (request.payload ?? {}) as Record<string, unknown>;
    let result: Record<string, unknown>;
    switch (request.type) {
      case 'add_owner':
        result = await this.executeAddOwner(payload, request.requestedBy, context);
        break;
      case 'revoke_all_sessions':
        result = await this.executeRevokeAllSessions();
        break;
      case 'bulk_directory_export':
        result = await this.executeBulkDirectoryExport(payload);
        break;
      case 'bulk_membership_revoke':
        result = await this.executeBulkMembershipRevoke(payload);
        break;
      case 'disable_audit':
        result = await this.executeDisableAudit(payload, request.requestedBy);
        break;
    }
    await this.prisma.dangerousActionRequest.update({
      where: { id: request.id },
      data: {
        status: 'executed',
        executedAt: new Date(),
        executionResult: result as Prisma.InputJsonValue,
      },
    });
    await this.audit.write({
      actorId: null,
      action: 'dangerous_action.executed',
      resourceType: 'dangerous_action_request',
      resourceId: request.id,
      result: 'success',
      afterRedacted: { type: request.type },
      requestId: context.requestId ?? null,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
    });
  }

  private async executeAddOwner(
    payload: Record<string, unknown>,
    requestedBy: string,
    context: RequestContext,
  ) {
    const invitation = await this.staffInvitations.inviteOwner(
      payload.email as string,
      payload.displayName as string,
      payload.organizationId as string,
      requestedBy,
      context,
    );
    return { invitationId: invitation.invitationId, email: invitation.email };
  }

  /** Interpreted as "revoke every active session platform-wide" (force a
   * global re-login) — the concrete, real, auditable action behind "đổi
   * khoá bảo mật" this codebase can actually perform. Rotating the RS256
   * signing keypair itself is a deploy-time infra operation (new key files,
   * coordinated restart), not something an HTTP endpoint can safely do. */
  private async executeRevokeAllSessions() {
    const result = await this.prisma.refreshSession.updateMany({
      where: { revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'owner_dangerous_action_revoke_all_sessions' },
    });
    return { revokedSessionCount: result.count };
  }

  /** Scoped to the organization's administrative directory (users, roles,
   * clinic/department assignments) — NOT a bulk clinical-record export.
   * Dumping full patient/clinical data through a single dangerous-action
   * JSON blob would itself be a compliance liability; a real bulk clinical
   * export belongs behind its own consent/purpose-limitation review, not
   * this generic quorum mechanism. */
  private async executeBulkDirectoryExport(payload: Record<string, unknown>) {
    const organizationId = payload.organizationId as string;
    const memberships = await this.prisma.userMembership.findMany({
      where: { organizationId, status: 'active' },
      include: { user: { select: { email: true, displayName: true, status: true } } },
    });
    const rows = memberships.map((m) => ({
      email: m.user.email,
      displayName: m.user.displayName,
      role: m.role,
      status: m.user.status,
      clinicLocationId: m.clinicLocationId,
      departmentId: m.departmentId,
    }));
    return { organizationId, userCount: rows.length, users: rows };
  }

  /** Mass offboarding: revokes every active non-Owner membership in the
   * organization. Deliberately never touches `super_administrator`
   * memberships (an Owner cannot use this to lock out the other Owners) and
   * never deletes the underlying User/clinical rows — reversible by
   * re-inviting, unlike an irreversible hard delete of clinical records,
   * which this action intentionally does not do. */
  private async executeBulkMembershipRevoke(payload: Record<string, unknown>) {
    const organizationId = payload.organizationId as string;
    const result = await this.prisma.userMembership.updateMany({
      where: { organizationId, status: 'active', role: { not: 'super_administrator' } },
      data: { status: 'revoked', endsAt: new Date() },
    });
    return { organizationId, revokedMembershipCount: result.count };
  }

  /**
   * Deliberately NOT a real "turn off the audit log" switch — `audit_events`
   * has an append-only DB trigger by design (migration 0002) and every
   * security/governance/MFA/break-glass action is hard-coded in AuditService
   * to ignore this suspension entirely (see NEVER_SUPPRESSED_PREFIXES). What
   * this executes is a short, hard-capped (≤30 minutes) suppression of
   * routine operational audit noise only — e.g. to quiet a known-noisy bug
   * during an active incident — never the compliance-relevant trail.
   */
  private async executeDisableAudit(payload: Record<string, unknown>, requestedBy: string) {
    const requestedMinutes = typeof payload.minutes === 'number' ? payload.minutes : 15;
    const minutes = Math.min(
      Math.max(Math.floor(requestedMinutes), 1),
      MAX_AUDIT_SUSPENSION_MINUTES,
    );
    const until = new Date(Date.now() + minutes * 60_000);
    await this.prisma.platformSecuritySetting.upsert({
      where: { id: 1 },
      update: {
        auditSuspendedUntil: until,
        auditSuspendedBy: requestedBy,
        auditSuspendedReason: (payload.reason as string) ?? null,
      },
      create: {
        id: 1,
        auditSuspendedUntil: until,
        auditSuspendedBy: requestedBy,
        auditSuspendedReason: (payload.reason as string) ?? null,
      },
    });
    return {
      suspendedUntil: until.toISOString(),
      minutes,
      scope: 'non-critical audit actions only',
    };
  }
}
