import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeForLogs } from './log-sanitizer.util';

describe('sanitizeForLogs', () => {
  it('redacts sensitive keys case-insensitively and recursively', () => {
    assert.deepEqual(
      sanitizeForLogs({
        Authorization: 'Bearer token',
        Cookie: 'sid=secret',
        nested: {
          NewPassword: 'abc123',
          accessToken: 'token',
          tokenCount: 2,
        },
      }),
      {
        Authorization: '[REDACTED]',
        Cookie: '[REDACTED]',
        nested: {
          NewPassword: '[REDACTED]',
          accessToken: '[REDACTED]',
          tokenCount: '[REDACTED]',
        },
      },
    );
  });

  it('redacts sensitive keys inside arrays', () => {
    assert.deepEqual(
      sanitizeForLogs([{ csrfToken: 'csrf' }, { value: 'safe' }]),
      [{ csrfToken: '[REDACTED]' }, { value: 'safe' }],
    );
  });
});
