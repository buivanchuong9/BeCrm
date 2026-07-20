import { AuthenticatedPrincipal } from '../../../../core/security/auth.types';
import { ForbiddenAppError } from '../../../../core/errors/app-error';

const NOTIFICATION_ADMIN_ROLES = ['medical_administrator', 'system_administrator'] as const;

function hasRole(principal: AuthenticatedPrincipal, role: string): boolean {
  return principal.memberships.some((m) => m.role === role);
}

export function isNotificationAdmin(principal: AuthenticatedPrincipal): boolean {
  return (
    hasRole(principal, 'super_administrator') ||
    NOTIFICATION_ADMIN_ROLES.some((role) => hasRole(principal, role))
  );
}

export function assertNotificationAdmin(principal: AuthenticatedPrincipal): void {
  if (!isNotificationAdmin(principal)) {
    throw new ForbiddenAppError('AUTH_FORBIDDEN');
  }
}

/** `GET /notifications` scope: defaults to the caller's own notifications;
 * `scope=all` only widens to every recipient, and only for an admin. */
export function resolveListRecipientScope(
  principal: AuthenticatedPrincipal,
  userId: string | undefined,
  all: boolean,
): string | undefined {
  const isAdmin = isNotificationAdmin(principal);
  const recipientId = all && isAdmin ? undefined : (userId ?? principal.userId);
  if (recipientId !== principal.userId && !isAdmin) {
    throw new ForbiddenAppError('AUTH_FORBIDDEN');
  }
  return recipientId;
}

export function assertCanViewRecipient(
  principal: AuthenticatedPrincipal,
  recipientId: string,
): void {
  if (recipientId !== principal.userId && !isNotificationAdmin(principal)) {
    throw new ForbiddenAppError('AUTH_FORBIDDEN');
  }
}

export function assertCanAccessNotification(
  principal: AuthenticatedPrincipal,
  notification: { recipientId: string },
): void {
  if (notification.recipientId !== principal.userId && !isNotificationAdmin(principal)) {
    throw new ForbiddenAppError('AUTH_FORBIDDEN');
  }
}
