import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FormControl, Validators } from '@angular/forms';
import { getControlErrorKey } from './form.utils';

describe('getControlErrorKey', () => {
  it('provides a default message for required controls without a field map', () => {
    const control = new FormControl('', Validators.required);
    control.markAsTouched();

    assert.equal(getControlErrorKey(control, []), 'validation.required');
  });
});
