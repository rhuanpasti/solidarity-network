import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterSelectOptions, type SelectOption } from './form-select.component';

const options: SelectOption[] = [
  { value: 'food', label: 'Food program' },
  { value: 'housing', label: 'Housing program' },
  { value: 'health', label: 'Health program' },
];

describe('filterSelectOptions', () => {
  it('filters program labels while keeping selected options visible', () => {
    assert.deepEqual(filterSelectOptions(options, 'housing'), [options[1]]);
    assert.deepEqual(filterSelectOptions(options, 'health', ['food']), [options[0], options[2]]);
  });

  it('returns all options for an empty search', () => {
    assert.deepEqual(filterSelectOptions(options, '  '), options);
  });
});
