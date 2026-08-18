import { Injector, runInInjectionContext, signal } from '@angular/core';
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Router } from '@angular/router';
import { authGuard, loginGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  afterEach(() => {
    mock.reset();
  });

  it('uses the local session without making a validation request', () => {
    const session = signal({
      accountType: 'administrator',
      role: 'case_worker',
      mustChangePassword: false,
    });
    const createUrlTree = mock.fn();
    const injector = Injector.create({
      providers: [
        {
          provide: AuthService,
          useValue: {
            session,
            requiresPasswordChange: () => false,
            resolveHomeUrl: () => '/dashboard',
          },
        },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });

    const result = runInInjectionContext(injector, () =>
      authGuard(
        { data: { accountTypes: ['administrator'] } } as never,
        { url: '/dashboard' } as never,
      ),
    );

    assert.equal(result, true);
    assert.equal(createUrlTree.mock.callCount(), 0);
  });

  it('redirects immediately when there is no local session', () => {
    const loginTree = { path: '/login' };
    const createUrlTree = mock.fn(() => loginTree);
    const injector = Injector.create({
      providers: [
        {
          provide: AuthService,
          useValue: { session: signal(null) },
        },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });

    const result = runInInjectionContext(injector, () =>
      authGuard({ data: {} } as never, { url: '/dashboard' } as never),
    );

    assert.equal(result, loginTree);
    assert.deepEqual(createUrlTree.mock.calls[0]?.arguments, [
      ['/login'],
      { queryParams: { returnUrl: '/dashboard' } },
    ]);
  });

  it('keeps case workers away from sensitive administrator routes', () => {
    const homeTree = { path: '/dashboard' };
    const createUrlTree = mock.fn(() => homeTree);
    const injector = Injector.create({
      providers: [
        {
          provide: AuthService,
          useValue: {
            session: signal({
              accountType: 'administrator',
              role: 'case_worker',
              mustChangePassword: false,
            }),
            requiresPasswordChange: () => false,
            resolveHomeUrl: () => '/dashboard',
          },
        },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });

    const result = runInInjectionContext(injector, () =>
      authGuard(
        {
          data: {
            accountTypes: ['administrator'],
            administratorRoles: ['super_admin', 'program_manager'],
          },
        } as never,
        { url: '/beneficiaries' } as never,
      ),
    );

    assert.equal(result, homeTree);
  });

  it('validates an existing session before leaving the login route', async () => {
    const createUrlTree = mock.fn(() => ({ path: '/dashboard' }));
    const validateStoredSession = mock.fn(async () => true);
    const injector = Injector.create({
      providers: [
        {
          provide: AuthService,
          useValue: {
            session: signal({ accountType: 'administrator' }),
            validateStoredSession,
            resolvePostLoginUrl: () => '/dashboard',
          },
        },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });

    const result = await runInInjectionContext(injector, () =>
      loginGuard(
        {
          queryParamMap: { get: () => null },
        } as never,
      ),
    );

    assert.equal(validateStoredSession.mock.callCount(), 1);
    assert.deepEqual(result, { path: '/dashboard' });
  });

  it('allows the login page when session validation rejects the stored session', async () => {
    const createUrlTree = mock.fn();
    const session = signal<{ accountType: string } | null>({ accountType: 'administrator' });
    const validateStoredSession = mock.fn(async () => {
      session.set(null);
      return false;
    });
    const injector = Injector.create({
      providers: [
        {
          provide: AuthService,
          useValue: {
            session,
            validateStoredSession,
          },
        },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });

    const result = await runInInjectionContext(injector, () =>
      loginGuard({ queryParamMap: { get: () => null } } as never),
    );

    assert.equal(result, true);
    assert.equal(createUrlTree.mock.callCount(), 0);
  });

  it('checks the server even when no cached session exists', async () => {
    const validateStoredSession = mock.fn(async () => false);
    const injector = Injector.create({
      providers: [
        {
          provide: AuthService,
          useValue: {
            session: signal(null),
            validateStoredSession,
          },
        },
        { provide: Router, useValue: { createUrlTree: mock.fn() } },
      ],
    });

    const result = await runInInjectionContext(injector, () =>
      loginGuard({ queryParamMap: { get: () => null } } as never),
    );

    assert.equal(result, true);
    assert.equal(validateStoredSession.mock.callCount(), 1);
  });
});
