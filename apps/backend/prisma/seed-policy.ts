export interface SeedEnvironment {
  NODE_ENV?: string;
  DEMO_SEED_ENABLED?: string;
  DEMO_SEED_ALLOW_PRODUCTION?: string;
}

export function assertSeedAllowed(environment: SeedEnvironment) {
  if (environment.DEMO_SEED_ENABLED !== 'true') {
    throw new Error(
      'Demo seed is disabled. Set DEMO_SEED_ENABLED=true for an intentional demo database.',
    );
  }

  if (
    environment.NODE_ENV === 'production' &&
    environment.DEMO_SEED_ALLOW_PRODUCTION !== 'true'
  ) {
    throw new Error(
      'Production demo seed is disabled. Set DEMO_SEED_ALLOW_PRODUCTION=true explicitly.',
    );
  }
}
