export interface AppEnvironment {
  PORT: number;
  DATABASE_URL: string;
  CORS_ORIGIN: string;
  JWT_SECRET: string;
}

export function validateEnv(config: Record<string, unknown>): AppEnvironment {
  const required = ['DATABASE_URL', 'JWT_SECRET'] as const;

  for (const key of required) {
    if (!config[key] || typeof config[key] !== 'string') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return {
    PORT: Number(config.PORT ?? 3000),
    DATABASE_URL: String(config.DATABASE_URL),
    CORS_ORIGIN: String(config.CORS_ORIGIN ?? 'http://localhost:4200'),
    JWT_SECRET: String(config.JWT_SECRET),
  };
}

