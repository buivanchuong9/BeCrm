import { Body, Controller, Delete, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiNoContentResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/auth/public.decorator';
import { UnauthorizedAppError } from '../../common/errors/app-error';
import { ApiCreatedEnvelope, ApiOkEnvelope } from '../../common/http/api-envelope.decorator';
import { AppConfiguration } from '../../config/configuration';
import { AuthService, LoginResult } from './auth.service';
import { CreateSessionRequest, EndAllSessionsRequest } from './dto/create-session.dto';
import { SessionResponseDto } from './dto/responses/current-user-response.dto';
import { PasswordService } from './password.service';
import { UsersRepository } from './users.repository';
import { toCurrentUserResponse } from './user-response.mapper';

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
    private readonly passwordService: PasswordService,
    private readonly users: UsersRepository,
    private readonly config: ConfigService<AppConfiguration, true>,
  ) {}

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
