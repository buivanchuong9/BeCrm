import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuthenticatedPrincipal } from '../auth/auth.types';
import { ForbiddenAppError } from '../errors/app-error';

const CACHE_TTL_MS = 5 * 60_000;

/**
 * The "Role + Permission" half of the authorization decision in the
 * permission model (Resource Scope stays in each module's own policy
 * functions — ownership/membership checks vary too much per resource to
 * generalize here; Feature Flag is FeatureFlagsService). RolePermission rows
 * are cached in-process because they change rarely (an Owner action, not a
 * per-request event) — `invalidate()` is called by whatever mutates the
 * table so a grant/revoke is visible immediately on this instance, with a
 * 5-minute TTL as a backstop for other instances in a multi-node deployment.
 */
@Injectable()
export class PolicyEngineService {
  private cache: Map<string, Set<UserRole>> | null = null;
  private cachedAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  invalidate(): void {
    this.cache = null;
  }

  private async rolesFor(permissionCode: string): Promise<Set<UserRole>> {
    if (!this.cache || Date.now() - this.cachedAt > CACHE_TTL_MS) {
      const rows = await this.prisma.rolePermission.findMany({
        select: { role: true, permissionCode: true },
      });
      const next = new Map<string, Set<UserRole>>();
      for (const row of rows) {
        const set = next.get(row.permissionCode) ?? new Set<UserRole>();
        set.add(row.role);
        next.set(row.permissionCode, set);
      }
      this.cache = next;
      this.cachedAt = Date.now();
    }
    return this.cache.get(permissionCode) ?? new Set<UserRole>();
  }

  /** Optionally narrow to roles held within `organizationId` — pass it
   * whenever the action is scoped to one organization so a role held only in
   * a *different* org can't satisfy the check. */
  async can(
    principal: AuthenticatedPrincipal,
    permissionCode: string,
    organizationId?: string,
  ): Promise<boolean> {
    const heldRoles = new Set(
      principal.memberships
        .filter((m) => !organizationId || m.organizationId === organizationId)
        .map((m) => m.role),
    );
    if (heldRoles.size === 0) return false;
    const grantedRoles = await this.rolesFor(permissionCode);
    for (const role of heldRoles) {
      if (grantedRoles.has(role)) return true;
    }
    return false;
  }

  async assert(
    principal: AuthenticatedPrincipal,
    permissionCode: string,
    organizationId?: string,
  ): Promise<void> {
    if (!(await this.can(principal, permissionCode, organizationId))) {
      throw new ForbiddenAppError(
        'AUTH_FORBIDDEN',
        `This action requires permission "${permissionCode}".`,
      );
    }
  }
}
