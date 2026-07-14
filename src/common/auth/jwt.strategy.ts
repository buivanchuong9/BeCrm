import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AccessTokenClaims, AuthenticatedPrincipal } from './auth.types';
import { AppConfiguration } from '../../config/configuration';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService<AppConfiguration, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => ExtractJwt.fromAuthHeaderAsBearerToken()(req),
      ]),
      ignoreExpiration: false,
      algorithms: ['RS256'],
      secretOrKey: config.get('auth', { infer: true }).accessTokenPublicKey,
    });
  }

  validate(payload: AccessTokenClaims): AuthenticatedPrincipal {
    return {
      userId: payload.sub,
      email: payload.email,
      displayName: payload.displayName,
      memberships: payload.memberships,
    };
  }
}
