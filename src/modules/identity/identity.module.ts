import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PatientsModule } from '../patients/patients.module';
import { AuthController } from './auth.controller';
import { MeController } from './me.controller';
import { UsersController } from './users.controller';
import { AuthService } from './auth.service';
import { RegistrationService } from './registration.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { UsersRepository } from './users.repository';
import { UserPreferencesRepository } from './user-preferences.repository';
import { RefreshSessionsRepository } from './refresh-sessions.repository';
import { JwtStrategy } from '../../core/security/jwt.strategy';
import { PasswordResetService } from './password-reset.service';
import { AuditModule } from '../../core/audit/audit.module';
import { MfaService } from './mfa/mfa.service';
import { StaffInvitationsService } from './staff-invitations.service';

@Module({
  imports: [PassportModule, JwtModule.register({}), PatientsModule, AuditModule],
  controllers: [AuthController, MeController, UsersController],
  providers: [
    AuthService,
    RegistrationService,
    PasswordService,
    PasswordResetService,
    TokenService,
    UsersRepository,
    UserPreferencesRepository,
    RefreshSessionsRepository,
    JwtStrategy,
    MfaService,
    StaffInvitationsService,
  ],
  exports: [UsersRepository, MfaService, StaffInvitationsService],
})
export class IdentityModule {}
