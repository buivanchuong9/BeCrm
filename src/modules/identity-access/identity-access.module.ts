import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { JwtStrategy } from '../../shared/guards/jwt.strategy';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';

import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';

import { PermissionController } from './permission/permission.controller';
import { PermissionService } from './permission/permission.service';

import { RoleController } from './role/role.controller';
import { RoleService } from './role/role.service';

import { EmployeeController } from './employee/employee.controller';
import { EmployeeService } from './employee/employee.service';

/**
 * IdentityAccessModule — IAM, Authentication, Employee Management, RBAC
 *
 * Registers:
 *  - Global JWT auth guard (all routes protected by default)
 *  - Global roles guard for @Roles() decorator
 *  - All /authenticator/*, /adminapi/employee/*, /adminapi/permission/*, /adminapi/role/* routes
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET', 'default-secret'),
        signOptions: { expiresIn: cfg.get<string>('JWT_EXPIRES_IN', '7d') },
      }),
    }),
  ],
  controllers: [
    AuthController,
    UserController,
    PermissionController,
    RoleController,
    EmployeeController,
  ],
  providers: [
    JwtStrategy,
    AuthService,
    UserService,
    PermissionService,
    RoleService,
    EmployeeService,
    // ─── Global guards (registered here — nearest to auth logic) ───
    // Order matters: JwtAuthGuard runs first (validates token),
    // then RolesGuard checks @Roles() decorator
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [JwtModule, AuthService, UserService, JwtStrategy, EmployeeService],
})
export class IdentityAccessModule {}
