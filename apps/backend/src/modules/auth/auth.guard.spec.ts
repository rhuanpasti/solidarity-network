import { UnauthorizedException } from '@nestjs/common';
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  it('rejects a JWT issued before the account session version changed', async () => {
    const user = {
      sub: 'admin-1',
      username: 'admin',
      name: 'Admin',
      email: 'admin@example.org',
      role: 'super_admin',
      accountType: 'administrator',
      programIds: [],
      mustChangePassword: false,
      sessionVersion: 0,
      csrfToken: 'csrf-token',
      iat: 1,
      exp: 2,
    } as never;
    const currentUser = { ...user, sessionVersion: 1, csrfToken: '' };
    const request = {
      headers: { authorization: 'Bearer old-token' },
      method: 'GET',
    };
    const context = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => request }),
    };
    const reflector = {
      getAllAndOverride: mock.fn(() => false),
    };
    const auditTrailService = { record: mock.fn(async () => undefined) };
    const authRepository = {
      findAuthenticatedUser: mock.fn(async () => currentUser),
    };
    const requestContextService = { setAuthenticatedUser: mock.fn() };
    const logger = { warn: mock.fn() };
    const authTokenService = { verify: mock.fn(() => user) };
    const guard = new AuthGuard(
      reflector as never,
      auditTrailService as never,
      authRepository as never,
      requestContextService as never,
      logger as never,
      authTokenService as never,
    );

    await assert.rejects(
      () => guard.canActivate(context as never),
      (error: unknown) =>
        error instanceof UnauthorizedException &&
        (error.getResponse() as { code?: string }).code === 'SESSION_REVOKED',
    );
    assert.equal(auditTrailService.record.mock.calls[0]?.arguments[0].metadata.reason, 'session_revoked');
    assert.equal(requestContextService.setAuthenticatedUser.mock.callCount(), 0);
  });
});
