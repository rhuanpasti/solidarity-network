import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

  it('can search options that expose a translation key or value instead of a label', () => {
    const translatedOption: SelectOption = {
      value: 'food-security',
      translationKey: 'programs.foodSecurity',
    };

    assert.deepEqual(filterSelectOptions([translatedOption], 'food-security'), [translatedOption]);
  });

  it('leaves disabled state for reactive form controls to manage', () => {
    const source = readFileSync(
      new URL('./form-select.component.ts', import.meta.url),
      'utf8',
    );

    assert.doesNotMatch(
      source,
      /\[formControl\]="control\(\)"[\s\S]{0,120}\[disabled\]="readonly\(\)"/,
    );
  });
});
