import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAccountDisplayName } from './shell.component';

describe('resolveAccountDisplayName', () => {
  it('uses the generic Admin label for administrator accounts', () => {
    assert.equal(
      resolveAccountDisplayName({
        accountType: 'administrator',
        displayName: 'System Administrator',
      }),
      'Admin',
    );
  });

  it('preserves beneficiary display names', () => {
    assert.equal(
      resolveAccountDisplayName({
        accountType: 'beneficiary',
        displayName: 'Maria Aparecida Silva',
      }),
      'Maria Aparecida Silva',
    );
  });
});
