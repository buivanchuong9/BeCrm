import { UserStatus } from '@prisma/client';
import { MembershipScope } from '../../core/security/auth.types';
import { UserWithMemberships } from './users.repository';

export type ApiUserStatus = 'invited' | 'active' | 'locked' | 'disabled';

/**
 * The API contract (docs/api.md) only exposes a coarse account-lifecycle status.
 * Internally `suspended` covers both admin-suspended and (via the separate
 * `lockedUntil` timestamp, not exposed here) transient failed-login throttling —
 * both surface as `locked` to API consumers, matching the contract's four-value enum.
 */
const STATUS_MAP: Record<UserStatus, ApiUserStatus> = {
  pending_activation: 'invited',
  active: 'active',
  suspended: 'locked',
  deactivated: 'disabled',
};

export function toApiUserStatus(status: UserStatus): ApiUserStatus {
  return STATUS_MAP[status];
}

export interface CurrentUserResponse {
  id: string;
  displayName: string;
  /** @deprecated Use displayName. */
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  status: ApiUserStatus;
  activeOrganizationId: string | null;
  memberships: MembershipScope[];
  version: number;
}

export function toCurrentUserResponse(
  user: UserWithMemberships,
  memberships: MembershipScope[],
): CurrentUserResponse {
  return {
    id: user.id,
    displayName: user.displayName,
    name: user.displayName,
    email: user.email,
    phone: user.phone,
    // Presigned avatar URL derivation lands with the T09 file service; until then
    // avatarFileId is stored but never resolved to a public-facing URL.
    avatarUrl: null,
    status: toApiUserStatus(user.status),
    activeOrganizationId: memberships[0]?.organizationId ?? null,
    memberships,
    version: user.version,
  };
}

export interface UserResponse {
  id: string;
  displayName: string;
  /** @deprecated Use displayName. */
  name: string;
  email: string;
  phone: string | null;
  status: ApiUserStatus;
  memberships: MembershipScope[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export function toUserResponse(
  user: UserWithMemberships,
  memberships: MembershipScope[],
): UserResponse {
  return {
    id: user.id,
    displayName: user.displayName,
    name: user.displayName,
    email: user.email,
    phone: user.phone,
    status: toApiUserStatus(user.status),
    memberships,
    version: user.version,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
