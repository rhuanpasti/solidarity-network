export interface AppEnvironment {
  PORT: number;
  DATABASE_URL: string;
  CORS_ORIGIN: string;
  JWT_SECRET: string;
  NODE_ENV: string;
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

  return {
    PORT: Number(config.PORT ?? 3000),
    DATABASE_URL: String(config.DATABASE_URL),
    CORS_ORIGIN: String(config.CORS_ORIGIN ?? 'http://localhost:4200'),
    JWT_SECRET: jwtSecret,
    NODE_ENV: String(config.NODE_ENV ?? 'development'),
  };
}
