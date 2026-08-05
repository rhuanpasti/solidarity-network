export interface AppEnvironment {
  PORT: number;
  DATABASE_URL: string;
  CORS_ORIGIN: string;
  JWT_SECRET: string;
  NODE_ENV: string;
  APP_PUBLIC_URL: string;
  PASSWORD_RESET_PATH: string;
  BREVO_ENABLED: boolean;
  BREVO_API_KEY?: string;
  BREVO_FROM_EMAIL: string;
  BREVO_FROM_NAME: string;
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
    BREVO_ENABLED: String(config.BREVO_ENABLED ?? 'false') === 'true',
    BREVO_API_KEY:
      typeof config.BREVO_API_KEY === 'string' &&
      config.BREVO_API_KEY.trim().length > 0
        ? config.BREVO_API_KEY.trim()
        : undefined,
    BREVO_FROM_EMAIL: String(config.BREVO_FROM_EMAIL ?? ''),
    BREVO_FROM_NAME: String(config.BREVO_FROM_NAME ?? 'Solidarity Network'),
  };
}
