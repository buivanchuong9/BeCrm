import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/auth/public.decorator';
import {
  ForbiddenAppError,
  UnauthorizedAppError,
  ValidationAppError,
} from '../../common/errors/app-error';
import {
  ApiCreatedEnvelope,
  ApiCreatedUnionEnvelope,
  ApiOkEnvelope,
} from '../../common/http/api-envelope.decorator';
import { AppConfiguration } from '../../config/configuration';
import { PolicyEngineService } from '../../common/authorization/policy-engine.service';
import { PERMISSIONS } from '../../common/authorization/permissions.catalog';
import { AuthService, LoginResult } from './auth.service';
import { RegistrationService } from './registration.service';
import { CreateSessionRequest, EndAllSessionsRequest } from './dto/create-session.dto';
import { CreateAccountRequest } from './dto/create-account.dto';
import { AcceptInvitationRequest } from './dto/invite-staff.dto';
import { StaffInvitationsService } from './staff-invitations.service';
import { TokenService } from './token.service';
import { SessionResponseDto } from './dto/responses/current-user-response.dto';
import { PasswordService } from './password.service';
import { UsersRepository } from './users.repository';
import { toCurrentUserResponse } from './user-response.mapper';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedPrincipal } from '../../common/auth/auth.types';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { PasswordResetService } from './password-reset.service';
import {
  PatientRegistrationResponseDto,
  StaffInvitationRegistrationResponseDto,
} from './dto/responses/registration-response.dto';

class ForgotPasswordRequest {
  @IsEmail() email!: string;
}
class ResetPasswordRequest {
  @IsString() token!: string;
  @IsString() @MinLength(12) newPassword!: string;
}

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

/** Session lifecycle modeled as a REST resource per docs/api.md section 25/26
 * ("Identity, current user, patients and consent"): sessions are created,
 * refreshed (a new session resource), and deleted — never verb-named RPC paths. */
@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly registrationService: RegistrationService,
    private readonly passwordService: PasswordService,
    private readonly passwordResetService: PasswordResetService,
    private readonly users: UsersRepository,
    private readonly config: ConfigService<AppConfiguration, true>,
    private readonly staffInvitations: StaffInvitationsService,
    private readonly tokenService: TokenService,
    private readonly policyEngine: PolicyEngineService,
  ) {}

  /**
   * The ONE account-creation endpoint — not two. Marked `@Public()` so it's
   * reachable with no token at all, but it still reads an optional bearer
   * token to decide which of the two branches applies:
   *
   * - No valid token → anonymous self-registration. `role` must be absent
   *   (always becomes `patient`); `password`/`dob`/`gender`/`phone` are
   *   required. Auto-issues a session, same as before.
   * - Valid token, caller holds `user.invite` → staff invitation. `role`
   *   (from INVITABLE_ROLES — never `patient` or `super_administrator`) and
   *   `organizationId` are required; no `password` (the invitee sets one at
   *   `POST /auth/invitations/activation`). Returns the invitation, not a
   *   session — the caller creating the account isn't the one logging in.
   *
   * A single compromised/careless client can therefore never mint a
   * privileged account by simply omitting a header: the branch is decided
   * server-side from a cryptographically verified token, not a client-sent
   * flag.
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiCreatedUnionEnvelope(PatientRegistrationResponseDto, StaffInvitationRegistrationResponseDto)
  @Post('registrations')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: CreateAccountRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const principal = this.extractPrincipal(req);
    const context = { ip: req.ip, userAgent: req.header('user-agent'), requestId: req.requestId };

    if (principal) {
      await this.policyEngine.assert(principal, PERMISSIONS.USER_INVITE);
      if (!dto.role) {
        throw new ValidationAppError(
          [{ field: 'role', code: 'VALIDATION_FAILED' }],
          'role is required when creating a staff account.',
        );
      }
      if (!dto.organizationId) {
        throw new ValidationAppError(
          [{ field: 'organizationId', code: 'VALIDATION_FAILED' }],
          'organizationId is required when creating a staff account.',
        );
      }
      const invitation = await this.staffInvitations.invite(
        principal,
        {
          email: dto.email,
          displayName: dto.displayName ?? dto.name!,
          role: dto.role,
          organizationId: dto.organizationId,
          clinicLocationId: dto.clinicLocationId,
          departmentId: dto.departmentId,
        },
        context,
      );
      return { data: { mode: 'invited', ...invitation } };
    }

    if (dto.role) {
      throw new ForbiddenAppError(
        'AUTH_FORBIDDEN',
        'Only an authenticated caller with permission may set a role — self-registration is always a patient account.',
      );
    }
    if (!dto.password || !dto.dob || !dto.gender || !dto.phone) {
      throw new ValidationAppError(
        [
          { field: 'password', code: 'VALIDATION_ERROR', message: 'Password is required.' },
          { field: 'dob', code: 'VALIDATION_ERROR', message: 'Date of birth is required.' },
          { field: 'gender', code: 'VALIDATION_ERROR', message: 'Gender is required.' },
          { field: 'phone', code: 'VALIDATION_ERROR', message: 'Phone is required.' },
        ].filter((d) => !dto[d.field as keyof CreateAccountRequest]),
        'password, dob, gender, and phone are required to self-register.',
      );
    }
    const result = await this.registrationService.registerPatient(
      {
        email: dto.email,
        password: dto.password,
        displayName: dto.displayName ?? dto.name!,
        dob: dto.dob,
        gender: dto.gender,
        phone: dto.phone,
        address: dto.address,
        organizationId: dto.organizationId,
        organizationCode: dto.organizationCode,
      },
      context,
    );
    this.setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
    return { data: { mode: 'registered', ...this.toSessionResponse(result) } };
  }

  private extractPrincipal(req: Request): AuthenticatedPrincipal | null {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) return null;
    return this.tokenService.verifyAccessToken(header.slice('Bearer '.length));
  }

  // Sets a password to activate an account created by the invite branch of
  // `POST /auth/registrations` above — a follow-up activation step for an
  // already-created account, not a second account-creation entry point.
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('invitations/activation')
  @HttpCode(HttpStatus.NO_CONTENT)
  async activateInvitation(
    @Body() dto: AcceptInvitationRequest,
    @Req() req: Request,
  ): Promise<void> {
    await this.staffInvitations.activate(dto.token, dto.password, {
      ip: req.ip,
      userAgent: req.header('user-agent'),
      requestId: req.requestId,
    });
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiCreatedEnvelope(SessionResponseDto)
  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  async createSession(
    @Body() dto: CreateSessionRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto.email, dto.password, dto.rememberMe, {
      ip: req.ip,
      userAgent: req.header('user-agent'),
      requestId: req.requestId,
    });
    this.setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
    return { data: this.toSessionResponse(result) };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiCreatedEnvelope(SessionResponseDto)
  @Post('login')
  @HttpCode(HttpStatus.CREATED)
  login(
    @Body() dto: CreateSessionRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.createSession(dto, req, res);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOkEnvelope(SessionResponseDto)
  @Post('session-refreshes')
  @HttpCode(HttpStatus.OK)
  async createSessionRefresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!rawToken) {
      throw new UnauthorizedAppError('AUTH_SESSION_EXPIRED', 'No active session.');
    }
    const result = await this.authService.refresh(rawToken, true, {
      ip: req.ip,
      userAgent: req.header('user-agent'),
      requestId: req.requestId,
    });
    this.setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
    return { data: this.toSessionResponse(result) };
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOkEnvelope(SessionResponseDto)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.createSessionRefresh(req, res);
  }

  @Get('me')
  async me(@CurrentUser() principal: AuthenticatedPrincipal) {
    const user = await this.users.findByIdWithMemberships(principal.userId);
    if (!user) throw new UnauthorizedAppError('AUTH_SESSION_EXPIRED', 'User no longer exists.');
    return { data: toCurrentUserResponse(user, this.users.toMembershipScopes(user)) };
  }

  @Public()
  @ApiNoContentResponse()
  @Delete('sessions/current')
  @HttpCode(HttpStatus.NO_CONTENT)
  async endCurrentSession(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (rawToken) {
      await this.authService.logout(rawToken, false, req.requestId);
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
  }

  @Public()
  @ApiNoContentResponse()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    return this.endCurrentSession(req, res);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  forgotPassword(@Body() dto: ForgotPasswordRequest, @Req() req: Request) {
    return this.passwordResetService.forgot(dto.email, req.requestId);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() dto: ResetPasswordRequest, @Req() req: Request): Promise<void> {
    await this.passwordResetService.reset(dto.token, dto.newPassword, req.requestId);
  }

  @Public()
  @ApiNoContentResponse()
  @Delete('sessions')
  @HttpCode(HttpStatus.NO_CONTENT)
  async endAllSessions(
    @Body() dto: EndAllSessionsRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!rawToken) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
      return;
    }
    if (dto.password !== undefined) {
      const owner = await this.authService.findSessionOwnerPasswordHash(rawToken);
      if (!owner || !(await this.passwordService.verify(owner, dto.password))) {
        throw new UnauthorizedAppError('AUTH_INVALID_CREDENTIALS', 'Invalid password.');
      }
    }
    await this.authService.logout(rawToken, true, req.requestId);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
  }

  private toSessionResponse(result: LoginResult) {
    return {
      accessToken: result.accessToken,
      accessTokenExpiresAt: new Date(
        Date.now() + result.accessTokenExpiresInSeconds * 1000,
      ).toISOString(),
      user: toCurrentUserResponse(result.user, this.users.toMembershipScopes(result.user)),
    };
  }

  private setRefreshCookie(res: Response, rawToken: string, expiresAt: Date) {
    const auth = this.config.get('auth', { infer: true });
    res.cookie(REFRESH_COOKIE_NAME, rawToken, {
      httpOnly: true,
      secure: auth.cookieSecure,
      sameSite: auth.cookieSameSite,
      domain: auth.cookieDomain,
      path: REFRESH_COOKIE_PATH,
      expires: expiresAt,
    });
  }
}
