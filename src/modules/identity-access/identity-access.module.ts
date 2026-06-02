import { Module } from '@nestjs/common';
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
  controllers: [AuthController, UserController, PermissionController, RoleController],
  providers: [
    JwtStrategy,
    AuthService,
    UserService,
    PermissionService,
    RoleService,
    // Global guards registered here — closest to where auth logic lives
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [JwtModule, AuthService, UserService, JwtStrategy],
})
export class IdentityAccessModule {}
