import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AccessTokenClaims, AuthenticatedPrincipal } from './auth.types';
import { AppConfiguration } from '../configuration/configuration';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService<AppConfiguration, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => ExtractJwt.fromAuthHeaderAsBearerToken()(req),
        // `EventSource` cannot set an Authorization header, so the SSE
        // stream is the one legitimate caller that must pass the access
        // token via query string. Scoped to that exact route only — this
        // extractor used to accept `?token=` on every authenticated
        // endpoint in the app, which meant a full-power access token could
        // leak into any URL an attacker convinced a client to hit, and from
        // there into proxy/access logs and the Referer header.
        (req: Request) => {
          if (req.path.endsWith('/queue/stream') && typeof req.query.token === 'string') {
            return req.query.token;
          }
          return null;
        },
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
