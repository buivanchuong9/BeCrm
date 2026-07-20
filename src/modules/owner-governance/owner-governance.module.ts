import { Module } from '@nestjs/common';
import { AuditModule } from '../../core/audit/audit.module';
import { IdentityModule } from '../identity/identity.module';
import { FeatureFlagsService } from '../../common/authorization/feature-flags.service';
import { FeatureFlagsController } from './feature-flags.controller';
import { RolePermissionsService } from './role-permissions.service';
import { RolePermissionsController } from './role-permissions.controller';
import { BreakGlassService } from './break-glass.service';
import { BreakGlassController } from './break-glass.controller';
import { DangerousActionsService } from './dangerous-actions.service';
import { DangerousActionsController } from './dangerous-actions.controller';

/**
 * Owner-only surface for the authorization decision engine's runtime knobs
 * (permission model boxes 2/3/5): the "Feature Flag" box (FeatureFlagsController),
 * the Role↔Permission matrix editor (RolePermissionsController), the 2-of-4
 * dangerous-action quorum (DangerousActionsController), and break-glass
 * emergency clinical-record access (BreakGlassController). Every route here
 * is gated by `@RequirePermission` (PermissionsGuard), never a bare
 * `@Roles('super_administrator')` — see require-permission.decorator.ts for
 * why that distinction matters.
 */
@Module({
  imports: [AuditModule, IdentityModule],
  controllers: [
    FeatureFlagsController,
    RolePermissionsController,
    BreakGlassController,
    DangerousActionsController,
  ],
  providers: [
    FeatureFlagsService,
    RolePermissionsService,
    BreakGlassService,
    DangerousActionsService,
  ],
  exports: [FeatureFlagsService, BreakGlassService],
})
export class OwnerGovernanceModule {}
