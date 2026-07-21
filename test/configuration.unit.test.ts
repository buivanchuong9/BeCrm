import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildConfiguration } from '../src/core/configuration/configuration';

/**
 * PRODUCTION INCIDENT REGRESSION: buildConfiguration()'s packageVersion()
 * helper used to resolve package.json via a `__dirname`-relative path
 * (`../../package.json`) that was correct only for this file's *old*
 * location (src/config/configuration.ts, two levels under src/). The
 * backend-refactor engagement moved it to
 * src/core/configuration/configuration.ts (one level deeper) without
 * updating that path, so the built image crash-looped on every boot with
 * `ENOENT: /app/dist/package.json`.
 *
 * This went undetected by every other test in this suite because they all
 * provide a fake ConfigService (`{ provide: ConfigService, useValue: ... }`),
 * which never calls the real buildConfiguration()/packageVersion() code at
 * all. This is the one test in the whole suite that calls it for real.
 */
describe('buildConfiguration — packageVersion resolution (production incident regression)', () => {
  const baseEnv = {
    NODE_ENV: 'production' as const,
    PORT: 3000,
    API_BASE_PATH: '/api/v1',
    FRONTEND_ORIGINS: 'http://localhost:5173',
    APP_PUBLIC_URL: 'http://localhost:3000',
    REQUEST_BODY_LIMIT: '1mb',
    TRUST_PROXY_HOPS: 0,
    RATE_LIMIT_TTL_MS: 60000,
    RATE_LIMIT_MAX: 100,
    DATABASE_URL: 'postgresql://x',
    REDIS_URL: 'redis://x',
    ACCESS_TOKEN_PRIVATE_KEY: 'x',
    ACCESS_TOKEN_PUBLIC_KEY: 'x',
    ACCESS_TOKEN_TTL: '10m',
    REFRESH_TOKEN_TTL: '30d',
    REFRESH_TOKEN_TTL_NOT_REMEMBERED: '24h',
    COOKIE_DOMAIN: '',
    COOKIE_SECURE: false,
    COOKIE_SAME_SITE: 'lax' as const,
    PASSWORD_PEPPER: 'x',
    FIELD_ENCRYPTION_KEY: 'x',
    S3_ENDPOINT: 'x',
    S3_REGION: 'x',
    S3_BUCKET: 'x',
    S3_ACCESS_KEY: 'x',
    S3_SECRET_KEY: 'x',
    S3_FORCE_PATH_STYLE: true,
    MAIL_FROM: 'x',
    SMTP_HOST: 'x',
    SMTP_PORT: 25,
    SMTP_USER: '',
    SMTP_PASSWORD: '',
    SMS_PROVIDER: 'disabled' as const,
    SMS_API_KEY: '',
    AI_PROVIDER: 'deterministic' as const,
    AI_MODEL_VERSION: 'x',
  };

  it('REGRESSION: resolves the real package.json version without throwing, matching the actual file', () => {
    const expected = (
      JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { version: string }
    ).version;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = buildConfiguration(baseEnv as any);
    assert.equal(config.documentation.version, expected);
  });

  it('uses package.json as the only version source even if a stale override is supplied', () => {
    const expected = (
      JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { version: string }
    ).version;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = buildConfiguration({ ...baseEnv, OPENAPI_VERSION: '9.9.9' } as any);
    assert.equal(config.documentation.version, expected);
  });
});
