import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import {
  ConflictAppError,
  NotFoundAppError,
  ValidationAppError,
} from '../../common/errors/app-error';
import { PatientsRepository } from '../patients/patients.repository';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { UsersRepository, UserWithMemberships } from './users.repository';
import { RefreshSessionsRepository, DeviceContext } from './refresh-sessions.repository';
import { LoginResult } from './auth.service';
import { RegisterPatientRequest } from './dto/register-patient.dto';

@Injectable()
export class RegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersRepository,
    private readonly patients: PatientsRepository,
    private readonly refreshSessions: RefreshSessionsRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Public patient self-registration: creates the User + its `patient`
   * membership + the Patient row atomically, then auto-logs the caller in
   * (same token-issuance path as AuthService.login) so the frontend doesn't
   * need a separate "log in right after registering" round trip.
   */
  async registerPatient(
    dto: RegisterPatientRequest,
    context: DeviceContext & { requestId?: string },
  ): Promise<LoginResult> {
    try {
      this.passwordService.assertAcceptablePassword(dto.password);
    } catch (err) {
      throw new ValidationAppError(
        [{ field: 'password', code: 'VALIDATION_FAILED', message: (err as Error).message }],
        (err as Error).message,
      );
    }

    const organization =
      dto.organizationId || dto.organizationCode
        ? await this.prisma.organization.findFirst({
            where: {
              ...(dto.organizationId ? { id: dto.organizationId } : {}),
              ...(dto.organizationCode ? { code: dto.organizationCode } : {}),
              status: 'active',
            },
          })
        : await this.resolveOnlyActiveOrganization();
    if (!organization) {
      throw new NotFoundAppError('Organization not found.');
    }

    const existing = await this.users.findByEmailWithMemberships(dto.email.toLowerCase());
    if (existing) {
      throw new ConflictAppError('CONFLICT', 'An account with this email already exists.');
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    let userId: string;
    try {
      userId = await this.prisma.$transaction(async (tx) => {
        const user = await this.users.createWithMembership(tx, {
          email: dto.email,
          passwordHash,
          displayName: dto.displayName,
          phone: dto.phone,
          organizationId: organization.id,
          role: 'patient',
        });

        const code = await this.patients.nextPatientCode(tx, organization.id);
        const patient = await this.patients.create(tx, {
          organizationId: organization.id,
          code,
          userId: user.id,
          name: dto.displayName,
          dob: new Date(`${dto.dob}T00:00:00.000Z`),
          gender: dto.gender,
          phone: dto.phone,
          email: dto.email.toLowerCase(),
          address: dto.address ?? null,
          bloodType: 'unknown',
        });

        await this.audit.write(
          {
            actorId: user.id,
            action: 'auth.registration.success',
            resourceType: 'user',
            resourceId: user.id,
            organizationId: organization.id,
            result: 'success',
            requestId: context.requestId ?? null,
            ip: context.ip ?? null,
            userAgent: context.userAgent ?? null,
          },
          tx,
        );
        await this.audit.write(
          {
            actorId: user.id,
            action: 'patient.created',
            resourceType: 'patient',
            resourceId: patient.id,
            patientId: patient.id,
            organizationId: organization.id,
            result: 'success',
            requestId: context.requestId ?? null,
            ip: context.ip ?? null,
            userAgent: context.userAgent ?? null,
          },
          tx,
        );

        return user.id;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictAppError('CONFLICT', 'An account with this email already exists.');
      }
      throw err;
    }

    const user = await this.users.findByIdWithMemberships(userId);
    if (!user) {
      throw new NotFoundAppError('User not found.');
    }
    return this.issueSession(user, context);
  }

  private async resolveOnlyActiveOrganization() {
    const organizations = await this.prisma.organization.findMany({
      where: { status: 'active' },
      take: 2,
    });
    if (organizations.length !== 1) {
      throw new ValidationAppError(
        [{ field: 'organizationCode', code: 'VALIDATION_FAILED' }],
        'organizationCode is required when more than one organization is available.',
      );
    }
    return organizations[0];
  }

  private async issueSession(
    user: UserWithMemberships,
    context: DeviceContext & { requestId?: string },
  ): Promise<LoginResult> {
    const memberships = this.users.toMembershipScopes(user);
    const accessToken = this.tokenService.signAccessToken(
      user.id,
      user.email,
      user.displayName,
      memberships,
    );
    const refreshToken = this.tokenService.issueRefreshToken(false);
    await this.refreshSessions.createFamily(user.id, refreshToken, context);

    return {
      accessToken: accessToken.token,
      accessTokenExpiresInSeconds: accessToken.expiresInSeconds,
      refreshToken: refreshToken.rawToken,
      refreshTokenExpiresAt: refreshToken.expiresAt,
      user,
    };
  }
}
