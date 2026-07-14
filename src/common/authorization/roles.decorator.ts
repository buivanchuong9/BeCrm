import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Flat role-membership gate (any org/clinic scope). For relationship-scoped
 * policies (patient ownership, care-team, assigned encounter) use a dedicated
 * policy class instead — RolesGuard only proves "this actor holds one of these
 * roles somewhere", never resource ownership. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
