import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CORS_ORIGINS,
  normalizeCorsOrigins,
  parseTrustProxy,
  validateEnv,
} from './env.schema';

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

  it('normalizes trailing slashes from configured origins', () => {
    assert.deepEqual(
      normalizeCorsOrigins(
        'http://localhost:4200/, https://solidarity-network-live.web.app/',
      ),
      ['http://localhost:4200', 'https://solidarity-network-live.web.app'],
    );

    const environment = validateEnv({
      DATABASE_URL: 'postgresql://localhost:5432/solidarity',
      JWT_SECRET: 'a'.repeat(32),
      CORS_ORIGIN: 'https://solidarity-network-live.web.app/',
    });

    assert.equal(environment.CORS_ORIGIN, 'https://solidarity-network-live.web.app');
  });

  it('parses explicit trusted proxy settings', () => {
    assert.equal(parseTrustProxy('false'), false);
    assert.equal(parseTrustProxy('1'), 1);
    assert.deepEqual(parseTrustProxy('10.0.0.0/8, 192.168.0.0/16'), [
      '10.0.0.0/8',
      '192.168.0.0/16',
    ]);
  });

  it('parses demo mode and keeps the configured demo credentials separate', () => {
    const environment = validateEnv({
      DATABASE_URL: 'postgresql://localhost:5432/solidarity',
      JWT_SECRET: 'a'.repeat(32),
      DEMO_MODE: 'true',
      DEMO_USER_USERNAME: ' demo-user ',
      DEMO_USER_EMAIL: ' Demo@Example.org ',
      DEMO_USER_PASSWORD: 'demo-password',
    });

    assert.equal(environment.DEMO_MODE, true);
    assert.equal(environment.DEMO_USER_USERNAME, 'demo-user');
    assert.equal(environment.DEMO_USER_EMAIL, 'demo@example.org');
    assert.equal(environment.DEMO_USER_PASSWORD, 'demo-password');
  });
});
