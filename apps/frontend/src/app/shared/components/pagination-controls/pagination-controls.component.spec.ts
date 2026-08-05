import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readPageSize } from './pagination-controls.component';

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
