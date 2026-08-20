import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
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
      { isEnabled: () => false } as never,
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

  it('accepts a valid demo token without reading the real account repository', async () => {
    const user = {
      sub: 'demo-user',
      username: 'demo@solidarity-network.local',
      name: 'Demo Administrator',
      email: 'demo@solidarity-network.local',
      role: 'super_admin',
      accountType: 'administrator',
      programIds: ['demo-program-food-security'],
      mustChangePassword: false,
      sessionVersion: 0,
      csrfToken: 'csrf-token',
      isDemo: true,
      iat: 1,
      exp: 2,
    } as never;
    const request = {
      headers: { authorization: 'Bearer demo-token' },
      method: 'GET',
    };
    const context = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => request }),
    };
    const authRepository = { findAuthenticatedUser: mock.fn() };
    const requestContextService = { setAuthenticatedUser: mock.fn() };
    const authTokenService = { verify: mock.fn(() => user) };
    const guard = new AuthGuard(
      { getAllAndOverride: mock.fn(() => false) } as never,
      { record: mock.fn() } as never,
      authRepository as never,
      requestContextService as never,
      { warn: mock.fn() } as never,
      authTokenService as never,
      { isEnabled: () => true } as never,
    );

    assert.equal(await guard.canActivate(context as never), true);
    assert.equal(authRepository.findAuthenticatedUser.mock.callCount(), 0);
    assert.equal(request.authUser.isDemo, true);
  });

  it('rejects a demo token when demo mode is disabled', async () => {
    const request = {
      headers: { authorization: 'Bearer demo-token' },
      method: 'GET',
    };
    const context = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => request }),
    };
    const user = {
      sub: 'demo-user',
      username: 'demo-user',
      name: 'Demo Administrator',
      email: 'demo@example.org',
      role: 'super_admin',
      accountType: 'administrator',
      programIds: [],
      mustChangePassword: false,
      sessionVersion: 0,
      csrfToken: 'csrf-token',
      isDemo: true,
      iat: 1,
      exp: 2,
    } as never;
    const authRepository = { findAuthenticatedUser: mock.fn() };
    const guard = new AuthGuard(
      { getAllAndOverride: mock.fn(() => false) } as never,
      { record: mock.fn() } as never,
      authRepository as never,
      { setAuthenticatedUser: mock.fn() } as never,
      { warn: mock.fn() } as never,
      { verify: mock.fn(() => user) } as never,
      { isEnabled: () => false } as never,
    );

    await assert.rejects(
      () => guard.canActivate(context as never),
      (error: unknown) =>
        error instanceof UnauthorizedException &&
        (error.getResponse() as { code?: string }).code === 'INVALID_DEMO_TOKEN',
    );
    assert.equal(authRepository.findAuthenticatedUser.mock.callCount(), 0);
  });

  it('still requires CSRF protection for demo cookie mutations', async () => {
    const request = {
      headers: {
        cookie: 'solidarity_network_session=demo-token',
      },
      method: 'POST',
    };
    const context = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => request }),
    };
    const user = {
      sub: 'demo-user', username: 'demo', name: 'Demo', email: 'demo@example.org',
      role: 'super_admin', accountType: 'administrator', programIds: [],
      mustChangePassword: false, sessionVersion: 0, csrfToken: 'csrf', isDemo: true,
      iat: 1, exp: 2,
    } as never;
    const guard = new AuthGuard(
      { getAllAndOverride: mock.fn(() => false) } as never,
      { record: mock.fn() } as never,
      { findAuthenticatedUser: mock.fn() } as never,
      { setAuthenticatedUser: mock.fn() } as never,
      { warn: mock.fn() } as never,
      { verify: mock.fn(() => user) } as never,
      { isEnabled: () => true } as never,
    );

    await assert.rejects(
      () => guard.canActivate(context as never),
      (error: unknown) => error instanceof ForbiddenException &&
        (error.getResponse() as { code?: string }).code === 'CSRF_TOKEN_INVALID',
    );
  });
});
