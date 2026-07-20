import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { MembershipScope } from '../../core/security/auth.types';
import { ConflictAppError, NotFoundAppError } from '../../core/errors/app-error';

export type UserWithMemberships = User & {
  memberships: Array<{
    organizationId: string;
    clinicLocationId: string | null;
    departmentId: string | null;
    role: MembershipScope['role'];
  }>;
};

const activeMembershipsInclude = {
  memberships: {
    where: { status: 'active' as const },
    orderBy: { createdAt: 'asc' as const },
    select: { organizationId: true, clinicLocationId: true, departmentId: true, role: true },
  },
} satisfies Prisma.UserInclude;

/** Pure persistence: no authorization decisions, no password verification. */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmailWithMemberships(email: string): Promise<UserWithMemberships | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: activeMembershipsInclude,
    });
  }

  findByIdWithMemberships(id: string): Promise<UserWithMemberships | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: activeMembershipsInclude,
    });
  }

  /** Registration-time creation (User + its initial membership), both inside
   * the caller's transaction. `status: 'active'` immediately — this repo has
   * no email-delivery infrastructure to gate on a verification step yet
   * (docs' UNKNOWN-5/AUTH-03 territory), documented as a Phase-1
   * simplification rather than a silent security gap. */
  async createWithMembership(
    tx: Prisma.TransactionClient,
    data: {
      email: string;
      passwordHash: string;
      displayName: string;
      phone?: string;
      organizationId: string;
      role: MembershipScope['role'];
    },
  ): Promise<User> {
    const user = await tx.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        displayName: data.displayName,
        phone: data.phone ?? null,
        status: 'active',
      },
    });
    await tx.userMembership.create({
      data: { userId: user.id, organizationId: data.organizationId, role: data.role },
    });
    return user;
  }

  async registerFailedLogin(id: string, lockThreshold: number, lockMinutes: number): Promise<void> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { failedLoginCount: { increment: 1 } },
    });
    if (user.failedLoginCount >= lockThreshold) {
      await this.prisma.user.update({
        where: { id },
        data: { lockedUntil: new Date(Date.now() + lockMinutes * 60_000) },
      });
    }
  }

  resetFailedLogin(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
  }

  async updateProfile(
    id: string,
    version: number,
    data: { displayName?: string; phone?: string; avatarFileId?: string },
  ): Promise<UserWithMemberships> {
    const result = await this.prisma.user.updateMany({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count === 0) {
      throw new ConflictAppError(
        'OPTIMISTIC_LOCK_FAILED',
        'The account was modified by another request.',
      );
    }
    const updated = await this.findByIdWithMemberships(id);
    if (!updated) {
      throw new NotFoundAppError('User not found.');
    }
    return updated;
  }

  async list(params: {
    page: number;
    limit: number;
    search?: string;
    role?: MembershipScope['role'];
    status?: User['status'];
  }): Promise<{ rows: UserWithMemberships[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      ...(params.search
        ? {
            OR: [
              { displayName: { contains: params.search, mode: 'insensitive' } },
              { email: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.role ? { memberships: { some: { role: params.role, status: 'active' } } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: activeMembershipsInclude,
        orderBy: { createdAt: 'asc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { rows, total };
  }

  toMembershipScopes(user: UserWithMemberships): MembershipScope[] {
    return user.memberships.map((m) => ({
      organizationId: m.organizationId,
      clinicLocationId: m.clinicLocationId,
      departmentId: m.departmentId,
      role: m.role,
    }));
  }
}
