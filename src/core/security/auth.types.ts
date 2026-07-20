import { UserRole } from '@prisma/client';

export interface MembershipScope {
  organizationId: string;
  clinicLocationId: string | null;
  departmentId: string | null;
  role: UserRole;
}

/** Populated onto `request.user` by JwtStrategy after verifying the access token. */
export interface AuthenticatedPrincipal {
  userId: string;
  email: string;
  displayName: string;
  memberships: MembershipScope[];
}

export interface AccessTokenClaims {
  sub: string;
  email: string;
  displayName: string;
  memberships: MembershipScope[];
}
