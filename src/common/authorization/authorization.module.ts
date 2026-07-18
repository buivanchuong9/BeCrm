import { Global, Module } from '@nestjs/common';
import { PolicyEngineService } from './policy-engine.service';
import { PermissionsGuard } from './permissions.guard';

/**
 * Global so PolicyEngineService (and PermissionsGuard, which depends on it)
 * is available to every module without each one re-importing it.
 *
 * PermissionsGuard itself is NOT registered as an APP_GUARD here — it is
 * bound explicitly in AppModule's own `providers` array, after JwtAuthGuard,
 * so ordering is guaranteed by array position rather than by Nest's
 * cross-module APP_GUARD resolution order (which is not a documented
 * contract). PermissionsGuard reads `request.user`, which JwtAuthGuard must
 * populate first.
 */
@Global()
@Module({
  providers: [PolicyEngineService, PermissionsGuard],
  exports: [PolicyEngineService, PermissionsGuard],
})
export class AuthorizationModule {}
