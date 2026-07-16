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
import { UnauthorizedAppError } from '../../common/errors/app-error';
import { ApiCreatedEnvelope, ApiOkEnvelope } from '../../common/http/api-envelope.decorator';
import { AppConfiguration } from '../../config/configuration';
import { AuthService, LoginResult } from './auth.service';
import { RegistrationService } from './registration.service';
import { CreateSessionRequest, EndAllSessionsRequest } from './dto/create-session.dto';
import { RegisterPatientRequest } from './dto/register-patient.dto';
import { SessionResponseDto } from './dto/responses/current-user-response.dto';
import { PasswordService } from './password.service';
import { UsersRepository } from './users.repository';
import { toCurrentUserResponse } from './user-response.mapper';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedPrincipal } from '../../common/auth/auth.types';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { PasswordResetService } from './password-reset.service';

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
  ) {}

  // Public patient self-registration — auto-issues a session on success so
  // the client doesn't need a separate login round trip immediately after.
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiCreatedEnvelope(SessionResponseDto)
  @Post('registrations')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterPatientRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.registrationService.registerPatient(dto, {
      ip: req.ip,
      userAgent: req.header('user-agent'),
      requestId: req.requestId,
    });
    this.setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
    return { data: this.toSessionResponse(result) };
  }

  /** Compatibility path from tailieuapi.md. */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiCreatedEnvelope(SessionResponseDto)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  registerAccount(
    @Body() dto: RegisterPatientRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.register(dto, req, res);
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
      sameSite: 'lax',
      domain: auth.cookieDomain,
      path: REFRESH_COOKIE_PATH,
      expires: expiresAt,
    });
  }
}
