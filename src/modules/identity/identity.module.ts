import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { MeController } from './me.controller';
import { UsersController } from './users.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { UsersRepository } from './users.repository';
import { UserPreferencesRepository } from './user-preferences.repository';
import { RefreshSessionsRepository } from './refresh-sessions.repository';
import { JwtStrategy } from '../../common/auth/jwt.strategy';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController, MeController, UsersController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    UsersRepository,
    UserPreferencesRepository,
    RefreshSessionsRepository,
    JwtStrategy,
  ],
  exports: [UsersRepository],
})
export class IdentityModule {}
