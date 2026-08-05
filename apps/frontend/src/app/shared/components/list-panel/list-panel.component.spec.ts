import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowListEmptyState } from './list-panel.component';

describe('shouldShowListEmptyState', () => {
  it('does not show the empty state while the initial list is loading', () => {
    assert.equal(shouldShowListEmptyState(true, false), false);
  });

  it('shows the empty state only after loading finishes without items', () => {
    assert.equal(shouldShowListEmptyState(false, false), true);
    assert.equal(shouldShowListEmptyState(false, true), false);
  });
});
