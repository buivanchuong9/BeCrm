import { z } from 'zod';

const boolFromString = z
  .string()
  .transform((v) => v.toLowerCase() === 'true')
  .pipe(z.boolean());

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_BASE_PATH: z.string().min(1).default('/api/v1'),
  OPENAPI_VERSION: z
    .string()
    .regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, 'Must be a semantic version')
    .optional(),

  FRONTEND_ORIGINS: z.string().min(1),
  APP_PUBLIC_URL: z.string().url(),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  ACCESS_TOKEN_PRIVATE_KEY: z.string().min(1),
  ACCESS_TOKEN_PUBLIC_KEY: z.string().min(1),
  ACCESS_TOKEN_TTL: z.string().min(1).default('10m'),
  REFRESH_TOKEN_TTL: z.string().min(1).default('30d'),
  REFRESH_TOKEN_TTL_NOT_REMEMBERED: z.string().min(1).default('24h'),
  COOKIE_DOMAIN: z.string().optional().default(''),
  COOKIE_SECURE: boolFromString.default('false'),

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

  SEED_DEMO_PASSWORD: z.string().optional(),
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
  if (parsed.data.NODE_ENV === 'production' && parsed.data.SEED_DEMO_PASSWORD) {
    throw new Error('SEED_DEMO_PASSWORD must not be set when NODE_ENV=production');
  }
  return parsed.data;
}
