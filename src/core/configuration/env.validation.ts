import { z } from 'zod';

const boolFromString = z
  .string()
  .transform((v) => v.toLowerCase() === 'true')
  .pipe(z.boolean());

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_BASE_PATH: z.string().min(1).default('/api/v1'),

  FRONTEND_ORIGINS: z.string().min(1),
  APP_PUBLIC_URL: z.string().url(),
  REQUEST_BODY_LIMIT: z
    .string()
    .regex(/^\d+(?:kb|mb)$/i)
    .default('1mb'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  RATE_LIMIT_TTL_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  ACCESS_TOKEN_PRIVATE_KEY: z.string().min(1),
  ACCESS_TOKEN_PUBLIC_KEY: z.string().min(1),
  ACCESS_TOKEN_TTL: z.string().min(1).default('10m'),
  REFRESH_TOKEN_TTL: z.string().min(1).default('30d'),
  REFRESH_TOKEN_TTL_NOT_REMEMBERED: z.string().min(1).default('24h'),
  COOKIE_DOMAIN: z.string().optional().default(''),
  COOKIE_SECURE: boolFromString.default('false'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  PASSWORD_PEPPER: z.string().min(1),
  FIELD_ENCRYPTION_KEY: z.string().min(1),

  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: boolFromString.optional().default('true'),

  MAIL_FROM: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),

  SMS_PROVIDER: z.string().default('disabled'),
  SMS_API_KEY: z.string().optional(),

  AI_PROVIDER: z.string().default('deterministic'),
  AI_MODEL_VERSION: z.string().default('derma-vision-2.4.0'),
  AI_API_KEY: z.string().optional(),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  SENTRY_DSN: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  const origins = parsed.data.FRONTEND_ORIGINS.split(',').map((origin) => origin.trim());
  for (const origin of origins) {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new Error(
        `Invalid environment configuration: FRONTEND_ORIGINS contains invalid URL: ${origin}`,
      );
    }
    if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol)) {
      throw new Error(
        `Invalid environment configuration: FRONTEND_ORIGINS must contain origins only: ${origin}`,
      );
    }
    if (parsed.data.NODE_ENV === 'production' && url.protocol !== 'https:') {
      throw new Error(
        `Invalid environment configuration: production frontend origin must use HTTPS: ${origin}`,
      );
    }
  }
  if (parsed.data.COOKIE_SAME_SITE === 'none' && !parsed.data.COOKIE_SECURE) {
    throw new Error(
      'Invalid environment configuration: COOKIE_SECURE must be true when COOKIE_SAME_SITE=none',
    );
  }
  return parsed.data;
}
