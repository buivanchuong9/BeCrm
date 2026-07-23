import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'requiredPermission';

/**
 * Fine-grained gate on top of (or instead of) `@Roles`: checks the
 * RolePermission table via PolicyEngineService rather than a hardcoded role
 * list, and — unlike `@Roles`/RolesGuard — never gives super_administrator a
 * blanket bypass. An Owner only passes this guard if `RolePermission` was
 * actually initialized/granted with that permission for their role.
 */
export const RequirePermission = (permissionCode: string) =>
  SetMetadata(PERMISSION_KEY, permissionCode);
