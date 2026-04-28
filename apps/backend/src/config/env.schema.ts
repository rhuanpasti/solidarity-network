export interface AppEnvironment {
  PORT: number;
  DATABASE_URL: string;
  CORS_ORIGIN: string;
  JWT_SECRET: string;
  NODE_ENV: string;
  APP_PUBLIC_URL: string;
  PASSWORD_RESET_PATH: string;
  SENDPULSE_ENABLED: boolean;
  SENDPULSE_API_USER_ID?: string;
  SENDPULSE_API_SECRET?: string;
  SENDPULSE_TOKEN_STORAGE: string;
  SENDPULSE_FROM_EMAIL: string;
  SENDPULSE_FROM_NAME: string;
}

export function validateEnv(config: Record<string, unknown>): AppEnvironment {
  const required = ['DATABASE_URL', 'JWT_SECRET'] as const;

  for (const key of required) {
    if (!config[key] || typeof config[key] !== 'string') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  const jwtSecret = String(config.JWT_SECRET).trim();
  const blockedSecrets = new Set([
    'change-me',
    'changeme',
    'replace-with-a-random-secret-with-at-least-32-characters',
  ]);

  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters.');
  }

  if (blockedSecrets.has(jwtSecret.toLowerCase())) {
    throw new Error('JWT_SECRET must be replaced with a strong secret.');
  }

  const corsOrigin = String(
    config.CORS_ORIGIN ??
      'http://localhost:4200,https://solidarity-network.rhuanpasti.workers.dev',
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .join(',');

  return {
    PORT: Number(config.PORT ?? 3000),
    DATABASE_URL: String(config.DATABASE_URL),
    CORS_ORIGIN: corsOrigin,
    JWT_SECRET: jwtSecret,
    NODE_ENV: String(config.NODE_ENV ?? 'development'),
    APP_PUBLIC_URL: String(config.APP_PUBLIC_URL ?? 'http://localhost:4200'),
    PASSWORD_RESET_PATH: String(config.PASSWORD_RESET_PATH ?? '/reset-password'),
    SENDPULSE_ENABLED: String(config.SENDPULSE_ENABLED ?? 'false') === 'true',
    SENDPULSE_API_USER_ID:
      typeof config.SENDPULSE_API_USER_ID === 'string' &&
      config.SENDPULSE_API_USER_ID.trim().length > 0
        ? config.SENDPULSE_API_USER_ID.trim()
        : undefined,
    SENDPULSE_API_SECRET:
      typeof config.SENDPULSE_API_SECRET === 'string' &&
      config.SENDPULSE_API_SECRET.trim().length > 0
        ? config.SENDPULSE_API_SECRET.trim()
        : undefined,
    SENDPULSE_TOKEN_STORAGE: String(config.SENDPULSE_TOKEN_STORAGE ?? '.sendpulse-tokens'),
    SENDPULSE_FROM_EMAIL: String(config.SENDPULSE_FROM_EMAIL ?? 'no-reply@example.org'),
    SENDPULSE_FROM_NAME: String(config.SENDPULSE_FROM_NAME ?? 'Solidarity Network'),
  };
}
