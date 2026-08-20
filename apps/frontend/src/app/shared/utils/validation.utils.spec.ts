import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBrazilianPhone,
  formatBrazilianPhoneForDisplay,
  formatCpf,
  formatCpfForDisplay,
} from './validation.utils';

describe('formatCpf', () => {
  it('formats CPF digits as they are entered', () => {
    assert.equal(formatCpf('12345678901'), '123.456.789-01');
    assert.equal(formatCpf('123.456.789-01'), '123.456.789-01');
  });

  it('removes non-digits and limits the value to eleven digits', () => {
    assert.equal(formatCpf('abc12345678901999'), '123.456.789-01');
  });

  it('formats complete CPF values for read-only displays without changing other documents', () => {
    assert.equal(formatCpfForDisplay('12345678901'), '123.456.789-01');
    assert.equal(formatCpfForDisplay('AB123456'), 'AB123456');
    assert.equal(formatCpfForDisplay(null), '');
  });
});

describe('formatBrazilianPhone', () => {
  it('formats mobile numbers with area code', () => {
    assert.equal(formatBrazilianPhone('21999995533'), '(21) 99999-5533');
  });

  it('formats landline numbers and limits extra digits', () => {
    assert.equal(formatBrazilianPhone('1133334444'), '(11) 3333-4444');
    assert.equal(formatBrazilianPhone('21999995533123'), '(21) 99999-5533');
  });

  it('formats valid phone values for read-only displays', () => {
    assert.equal(formatBrazilianPhoneForDisplay('21999995533'), '(21) 99999-5533');
    assert.equal(formatBrazilianPhoneForDisplay('+14155552671'), '+14155552671');
  });
});
