import { HttpException } from '@nestjs/common';
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthRateLimitService } from './auth-rate-limit.service';

function makeRequest(ip = '203.0.113.40') {
  return { ip } as Request;
}

function makeService() {
  const auditTrailService = { record: mock.fn(async () => undefined) };
  const repository = {
    findPasswordRecoveryRecipient: mock.fn(async () => null),
  };
  const demoDataService = {
    isEnabled: () => false,
    demoEmail: () => 'demo@example.org',
  };

  return {
    service: new AuthService(
      auditTrailService as never,
      { log: mock.fn(), warn: mock.fn(), error: mock.fn(), debug: mock.fn() } as never,
      new AuthRateLimitService(),
      repository as never,
      {} as never,
      {} as never,
      {} as never,
      demoDataService as never,
    ),
    repository,
  };
}

describe('AuthService password recovery', () => {
  it('blocks the fourth recovery request from the same IP for one hour', async () => {
    const { service, repository } = makeService();
    const request = makeRequest();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      assert.deepEqual(
        await service.forgotPassword({ email: `unknown-${attempt}@example.org` } as never, request),
        { success: true },
      );
    }

    await assert.rejects(
      () => service.forgotPassword({ email: 'fourth@example.org' } as never, request),
      (error: unknown) => {
        assert.ok(error instanceof HttpException);
        assert.equal(error.getStatus(), 429);
        assert.deepEqual(error.getResponse(), {
          code: 'TOO_MANY_PASSWORD_RECOVERY_ATTEMPTS',
          message: 'Too many password recovery requests. Please try again later.',
          details: { retryAfterSeconds: 3600 },
        });
        return true;
      },
    );

    assert.equal(repository.findPasswordRecoveryRecipient.mock.callCount(), 3);
  });
});
