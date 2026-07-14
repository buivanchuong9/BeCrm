import { EnvConfig } from './env.validation';

export function buildConfiguration(env: EnvConfig) {
  return {
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    port: env.PORT,
    apiBasePath: env.API_BASE_PATH,
    frontendOrigins: env.FRONTEND_ORIGINS.split(',').map((origin) => origin.trim()),
    appPublicUrl: env.APP_PUBLIC_URL,
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
    seedDemoPassword: env.SEED_DEMO_PASSWORD,
  };
}

export type AppConfiguration = ReturnType<typeof buildConfiguration>;
