import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('CheckboxFieldComponent', () => {
  it('leaves disabled state for the reactive form control to manage', () => {
    const source = readFileSync(
      new URL('./checkbox-field.component.ts', import.meta.url),
      'utf8',
    );

    assert.doesNotMatch(
      source,
      /\[formControl\]="control\(\)"[\s\S]{0,80}\[disabled\]="readonly\(\)"/,
    );
  });
});
