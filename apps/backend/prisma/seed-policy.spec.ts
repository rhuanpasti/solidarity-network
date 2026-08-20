import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertSeedAllowed } from './seed-policy';

describe('assertSeedAllowed', () => {
  it('requires the demo seed flag', () => {
    assert.throws(
      () => assertSeedAllowed({ NODE_ENV: 'development' }),
      /DEMO_SEED_ENABLED=true/,
    );
  });

  it('requires an explicit production opt-in', () => {
    assert.throws(
      () =>
        assertSeedAllowed({
          NODE_ENV: 'production',
          DEMO_SEED_ENABLED: 'true',
        }),
      /DEMO_SEED_ALLOW_PRODUCTION=true/,
    );
  });

  it('allows an explicitly enabled production demo seed', () => {
    assert.doesNotThrow(() =>
      assertSeedAllowed({
        NODE_ENV: 'production',
        DEMO_SEED_ENABLED: 'true',
        DEMO_SEED_ALLOW_PRODUCTION: 'true',
      }),
    );
  });
});
