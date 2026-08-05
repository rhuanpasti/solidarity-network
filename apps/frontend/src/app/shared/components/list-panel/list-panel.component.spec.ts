import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readPageSize, shouldShowListEmptyState } from './list-panel.component';

describe('shouldShowListEmptyState', () => {
  it('does not show the empty state while the initial list is loading', () => {
    assert.equal(shouldShowListEmptyState(true, false), false);
  });

  it('shows the empty state only after loading finishes without items', () => {
    assert.equal(shouldShowListEmptyState(false, false), true);
    assert.equal(shouldShowListEmptyState(false, true), false);
  });
});

describe('readPageSize', () => {
  it('returns the selected positive integer and falls back for invalid values', () => {
    assert.equal(
      readPageSize({ target: { value: '25' } } as unknown as Event, 10),
      25,
    );
    assert.equal(
      readPageSize({ target: { value: 'invalid' } } as unknown as Event, 10),
      10,
    );
  });
});
