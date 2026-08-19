import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeForAudit, sanitizeForLogs } from './log-sanitizer.util';

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

  it('masks personal data in persisted audit snapshots', () => {
    assert.deepEqual(
      sanitizeForAudit({
        document: '52998224725',
        phone: '+55 11 96540-1101',
        email: 'maria@example.org',
        address: { street: 'Rua das Palmeiras', number: '145' },
      }),
      {
        document: '*********25',
        phone: '***************01',
        email: '****a@example.org',
        address: '[REDACTED_ADDRESS]',
      },
    );
  });
});
