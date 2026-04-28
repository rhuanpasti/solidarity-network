import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { PasswordResetTokenService } from './password-reset-token.service';

function makeService() {
  return new PasswordResetTokenService({
    get: mock.fn((key: string) => {
      const values: Record<string, string> = {
        JWT_SECRET: 'a-secret-with-at-least-thirty-two-characters',
        APP_PUBLIC_URL: 'https://app.example.org',
        PASSWORD_RESET_PATH: '/reset-password',
      };

      return values[key];
    }),
  } as never);
}

describe('PasswordResetTokenService', () => {
  it('creates a reset link with a verifiable expiring token', () => {
    const service = makeService();

    const token = service.createToken({
      accountId: 'account-1',
      accountType: 'beneficiary',
      email: 'maria@example.org',
    });
    const link = service.buildResetLink(token);

    assert.match(link, /^https:\/\/app\.example\.org\/reset-password\?token=/);
    assert.deepEqual(service.verifyToken(token), {
      accountId: 'account-1',
      accountType: 'beneficiary',
      email: 'maria@example.org',
    });
  });

  it('rejects tampered reset tokens', () => {
    const service = makeService();
    const token = service.createToken({
      accountId: 'account-1',
      accountType: 'beneficiary',
      email: 'maria@example.org',
    });

    assert.equal(service.verifyToken(`${token}tampered`), null);
  });
});

