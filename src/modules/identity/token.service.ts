import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash } from 'crypto';
import { AccessTokenClaims, MembershipScope } from '../../common/auth/auth.types';
import { AppConfiguration } from '../../config/configuration';

export interface IssuedAccessToken {
  token: string;
  expiresInSeconds: number;
}

export interface IssuedRefreshToken {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<AppConfiguration, true>,
  ) {}

  signAccessToken(
    userId: string,
    email: string,
    displayName: string,
    memberships: MembershipScope[],
  ): IssuedAccessToken {
    const auth = this.config.get('auth', { infer: true });
    const claims: Omit<AccessTokenClaims, 'sub'> = { email, displayName, memberships };
    const token = this.jwtService.sign(claims, {
      subject: userId,
      algorithm: 'RS256',
      privateKey: auth.accessTokenPrivateKey,
      expiresIn: auth.accessTokenTtl,
    } as never);
    return { token, expiresInSeconds: ttlToSeconds(auth.accessTokenTtl) };
  }

  issueRefreshToken(remember: boolean): IssuedRefreshToken {
    const auth = this.config.get('auth', { infer: true });
    const rawToken = randomBytes(48).toString('base64url');
    const tokenHash = hashRefreshToken(rawToken);
    const ttl = remember ? auth.refreshTokenTtl : auth.refreshTokenTtlNotRemembered;
    const expiresAt = new Date(Date.now() + ttlToSeconds(ttl) * 1000);
    return { rawToken, tokenHash, expiresAt };
  }
}

export function hashRefreshToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

function ttlToSeconds(ttl: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(ttl.trim());
  if (!match) return 600;
  const value = Number(match[1]);
  const unit = match[2];
  const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[unit] ?? 1;
  return value * multiplier;
}
