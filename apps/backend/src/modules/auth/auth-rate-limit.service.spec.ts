import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { Request } from 'express';
import { AuthRateLimitService } from './auth-rate-limit.service';

function request(headers: Request['headers'], ip = '127.0.0.1') {
  return { headers, ip } as Request;
}

describe('AuthRateLimitService', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('uses the framework-resolved IP instead of trusting a client header', () => {
    const service = new AuthRateLimitService();

    assert.deepEqual(
      service.buildKeys(request({ 'x-forwarded-for': ' 203.0.113.10, 10.0.0.1 ' }, '192.0.2.20'), ' User@Email.COM '),
      ['auth:login:ip:192.0.2.20', 'auth:login:ip-identifier:192.0.2.20:user@email.com'],
    );
  });

  it('supports endpoint-specific keys', () => {
    const service = new AuthRateLimitService();

    assert.deepEqual(
      service.buildKeys(
        request({ 'x-forwarded-for': [' 203.0.113.11, 10.0.0.1 '] }, '192.0.2.21'),
        'User@Email.COM',
        'forgot-password',
      ),
      ['auth:forgot-password:ip:192.0.2.21', 'auth:forgot-password:ip-identifier:192.0.2.21:user@email.com'],
    );
  });

  it('blocks after the maximum number of failures and clears on success', () => {
    const service = new AuthRateLimitService();
    const keys = ['ip:203.0.113.10', 'ip-identifier:203.0.113.10:user@email.com'];

    for (let attempt = 0; attempt < 4; attempt += 1) {
      service.registerFailure(keys);
      assert.equal(service.getRetryAfterSeconds(keys), 0);
    }

    service.registerFailure(keys);
    assert.equal(service.getRetryAfterSeconds(keys), 900);

    service.registerSuccess(keys);
    assert.equal(service.getRetryAfterSeconds(keys), 0);
  });

  it('expires stale windows and completed blocks', () => {
    const service = new AuthRateLimitService();
    const keys = ['ip:198.51.100.2'];
    const now = Date.now();
    mock.method(Date, 'now', () => now);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      service.registerFailure(keys);
    }

    assert.equal(service.getRetryAfterSeconds(keys), 900);

    mock.method(Date, 'now', () => now + 15 * 60 * 1000 + 1);
    assert.equal(service.getRetryAfterSeconds(keys), 0);
  });

  it('allows normal public metrics traffic before applying its broader limit', () => {
    const service = new AuthRateLimitService();
    const keys = ['auth:public-metrics:ip:127.0.0.1'];

    for (let requestNumber = 0; requestNumber < 20; requestNumber += 1) {
      assert.equal(service.getRetryAfterSeconds(keys), 0);
      service.registerRequest(keys);
    }

    service.registerRequest(keys);
    assert.equal(service.getRetryAfterSeconds(keys), 900);
  });
});
