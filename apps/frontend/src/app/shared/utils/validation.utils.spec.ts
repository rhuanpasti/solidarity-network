import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatCpf, formatCpfForDisplay } from './validation.utils';

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
