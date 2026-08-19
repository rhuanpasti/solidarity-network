import { readFileSync } from 'node:fs';
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

describe('AppLayoutComponent', () => {
  it('does not render the inactive global search field', () => {
    const template = readFileSync(new URL('./shell.component.html', import.meta.url), 'utf8');

    assert.doesNotMatch(template, /search-field/);
    assert.doesNotMatch(template, /common\.searchWorkspace/);
  });
});
