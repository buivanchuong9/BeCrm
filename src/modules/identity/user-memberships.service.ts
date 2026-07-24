import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../core/audit/audit.service';
import { PrismaService } from '../../core/database/prisma.service';
import {
  ConflictAppError,
  ForbiddenAppError,
  NotFoundAppError,
  ValidationAppError,
} from '../../core/errors/app-error';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { AssignUserRoleRequest } from './dto/assign-user-role.dto';

export interface MembershipRequestContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class UserMembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async assign(
    principal: AuthenticatedPrincipal,
    userId: string,
    dto: AssignUserRoleRequest,
    context: MembershipRequestContext,
  ) {
    const canManageOrganization = principal.memberships.some(
      (membership) =>
        membership.role === 'super_administrator' ||
        membership.organizationId === dto.organizationId,
    );
    if (!canManageOrganization) {
      throw new ForbiddenAppError('CLINIC_SCOPE_DENIED', 'No membership in this organization.');
    }

    const [user, organization, clinicLocation, department] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
      this.prisma.organization.findUnique({
        where: { id: dto.organizationId },
        select: { id: true },
      }),
      dto.clinicLocationId
        ? this.prisma.clinicLocation.findUnique({
            where: { id: dto.clinicLocationId },
            select: { organizationId: true },
          })
        : null,
      dto.departmentId
        ? this.prisma.department.findUnique({
            where: { id: dto.departmentId },
            select: { organizationId: true },
          })
        : null,
    ]);

    if (!user) throw new NotFoundAppError('User not found.');
    if (!organization) throw new NotFoundAppError('Organization not found.');
    if (dto.clinicLocationId && clinicLocation?.organizationId !== dto.organizationId) {
      throw new ValidationAppError(
        [{ field: 'clinicLocationId', code: 'VALIDATION_FAILED' }],
        'Clinic location does not belong to the organization.',
      );
    }
    if (dto.departmentId && department?.organizationId !== dto.organizationId) {
      throw new ValidationAppError(
        [{ field: 'departmentId', code: 'VALIDATION_FAILED' }],
        'Department does not belong to the organization.',
      );
    }

    const existing = await this.prisma.userMembership.findFirst({
      where: {
        userId,
        organizationId: dto.organizationId,
        clinicLocationId: dto.clinicLocationId ?? null,
        role: dto.role,
      },
    });
    if (existing?.status === 'active') {
      throw new ConflictAppError('CONFLICT', 'This role membership is already active.');
    }

    try {
      const membership = await this.prisma.$transaction(async (tx) => {
        const result = existing
          ? await tx.userMembership.update({
              where: { id: existing.id },
              data: {
                status: 'active',
                startsAt: new Date(),
                endsAt: null,
                departmentId: dto.departmentId ?? null,
              },
            })
          : await tx.userMembership.create({
              data: {
                userId,
                organizationId: dto.organizationId,
                clinicLocationId: dto.clinicLocationId ?? null,
                departmentId: dto.departmentId ?? null,
                role: dto.role,
                status: 'active',
              },
            });

        await this.audit.write(
          {
            actorId: principal.userId,
            action: 'user_role.assigned',
            resourceType: 'user_membership',
            resourceId: result.id,
            organizationId: dto.organizationId,
            result: 'success',
            afterRedacted: {
              userId,
              role: dto.role,
              clinicLocationId: dto.clinicLocationId ?? null,
              departmentId: dto.departmentId ?? null,
            },
            requestId: context.requestId ?? null,
            ip: context.ip ?? null,
            userAgent: context.userAgent ?? null,
          },
          tx,
        );
        return result;
      });
      return membership;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictAppError('CONFLICT', 'This role membership is already active.');
      }
      throw error;
    }
  }
}
