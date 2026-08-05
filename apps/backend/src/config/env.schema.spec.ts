import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CORS_ORIGINS, validateEnv } from './env.schema';

describe('validateEnv', () => {
  it('allows the local frontend, deployed worker, and Firebase frontend by default', () => {
    const environment = validateEnv({
      DATABASE_URL: 'postgresql://localhost:5432/solidarity',
      JWT_SECRET: 'a'.repeat(32),
    });

    assert.equal(environment.CORS_ORIGIN, DEFAULT_CORS_ORIGINS);
    assert.match(
      environment.CORS_ORIGIN,
      /https:\/\/solidarity-network-live\.web\.app/,
    );
  });
});
