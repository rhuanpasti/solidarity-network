import { Injector, runInInjectionContext, signal } from '@angular/core';
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Router } from '@angular/router';
import { authGuard } from './auth.guard';
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
});
