import { readFileSync } from 'fs';
import { join } from 'path';
import { EnvConfig } from './env.validation';

function packageVersion(): string {
  // Avoid a static JSON import outside src/: it changes TypeScript's inferred
  // rootDir and moves the production entrypoint from dist/main.js to
  // dist/src/main.js. The runtime image always copies package.json to /app.
  //
  // BUG FIX (production incident): this used to be
  // `join(__dirname, '../../package.json')`, which depended on this file's
  // exact nesting depth under dist/ (it was correct back when this file
  // lived at src/config/configuration.ts, two levels deep). The backend
  // refactor moved it to src/core/configuration/configuration.ts, one level
  // deeper, silently turning `../../` into `dist/package.json` instead of
  // the real `/app/package.json` -- ENOENT on every boot in the built Docker
  // image, invisible in this repo's tests because every test provides a
  // fake ConfigService and never exercises the real buildConfiguration()
  // path. process.cwd() is not tied to this file's location at all: `npm
  // run <script>` and a container's WORKDIR both put it at the app root
  // (where package.json actually lives), so this survives the file being
  // moved again.
  const path = join(process.cwd(), 'package.json');
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as { version: string };
  return parsed.version;
}

export function buildConfiguration(env: EnvConfig) {
  return {
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    port: env.PORT,
    apiBasePath: env.API_BASE_PATH,
    documentation: { version: packageVersion() },
    frontendOrigins: env.FRONTEND_ORIGINS.split(',').map((origin) => origin.trim()),
    appPublicUrl: env.APP_PUBLIC_URL,
    requestBodyLimit: env.REQUEST_BODY_LIMIT,
    trustProxyHops: env.TRUST_PROXY_HOPS,
    rateLimit: { ttlMs: env.RATE_LIMIT_TTL_MS, max: env.RATE_LIMIT_MAX },
    database: { url: env.DATABASE_URL },
    redis: { url: env.REDIS_URL },
    auth: {
      accessTokenPrivateKey: env.ACCESS_TOKEN_PRIVATE_KEY.replace(/\\n/g, '\n'),
      accessTokenPublicKey: env.ACCESS_TOKEN_PUBLIC_KEY.replace(/\\n/g, '\n'),
      accessTokenTtl: env.ACCESS_TOKEN_TTL,
      refreshTokenTtl: env.REFRESH_TOKEN_TTL,
      refreshTokenTtlNotRemembered: env.REFRESH_TOKEN_TTL_NOT_REMEMBERED,
      cookieDomain: env.COOKIE_DOMAIN || undefined,
      cookieSecure: env.COOKIE_SECURE,
      cookieSameSite: env.COOKIE_SAME_SITE,
      passwordPepper: env.PASSWORD_PEPPER,
      fieldEncryptionKey: env.FIELD_ENCRYPTION_KEY,
    },
    storage: {
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      bucket: env.S3_BUCKET,
      accessKey: env.S3_ACCESS_KEY,
      secretKey: env.S3_SECRET_KEY,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    },
    mail: {
      from: env.MAIL_FROM,
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
    },
    sms: { provider: env.SMS_PROVIDER, apiKey: env.SMS_API_KEY },
    ai: { provider: env.AI_PROVIDER, modelVersion: env.AI_MODEL_VERSION, apiKey: env.AI_API_KEY },
    logLevel: env.LOG_LEVEL,
  };
}

export type AppConfiguration = ReturnType<typeof buildConfiguration>;
