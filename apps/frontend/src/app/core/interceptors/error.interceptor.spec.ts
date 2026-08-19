import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../services/toast.service';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  afterEach(() => {
    mock.reset();
  });

  it('expires the session, warns the user, and redirects for auth errors', () => {
    const expireSession = mock.fn(() => true);
    const logout = mock.fn(async () => undefined);
    const show = mock.fn();
    const navigate = mock.fn(() => Promise.resolve(true));
    const injector = Injector.create({
      providers: [
        { provide: AuthService, useValue: { expireSession, logout } },
        { provide: Router, useValue: { navigate } },
        { provide: ToastService, useValue: { show } },
      ],
    });
    const authErrorCodes = [
      'AUTH_REQUIRED',
      'INVALID_TOKEN',
      'AUTH_ACCOUNT_UNAVAILABLE',
      'CSRF_TOKEN_INVALID',
    ];

    for (const code of authErrorCodes) {
      const request = new HttpRequest('GET', '/api/protected');
      const error = new HttpErrorResponse({
        status: 401,
        error: { code },
      });
      const response$ = runInInjectionContext(injector, () =>
        errorInterceptor(request, () => throwError(() => error)),
      );

      response$.subscribe({ error: () => undefined });
    }

    assert.equal(expireSession.mock.callCount(), authErrorCodes.length);
    assert.equal(logout.mock.callCount(), authErrorCodes.length);
    assert.deepEqual(show.mock.calls[0]?.arguments[0], {
      type: 'error',
      translationKey: 'auth.sessionExpired',
    });
    assert.deepEqual(navigate.mock.calls[0]?.arguments, [['/login']]);
    assert.equal(show.mock.callCount(), authErrorCodes.length);
    assert.equal(navigate.mock.callCount(), authErrorCodes.length);
  });

  it('does not repeat the warning or redirect after expiration was handled', () => {
    let expirationHandled = false;
    const logout = mock.fn(async () => undefined);
    const expireSession = mock.fn(() => {
      if (expirationHandled) {
        return false;
      }

      expirationHandled = true;
      return true;
    });
    const show = mock.fn();
    const navigate = mock.fn(() => Promise.resolve(true));
    const injector = Injector.create({
      providers: [
        { provide: AuthService, useValue: { expireSession, logout } },
        { provide: Router, useValue: { navigate } },
        { provide: ToastService, useValue: { show } },
      ],
    });
    const request = new HttpRequest('GET', '/api/protected');
    const error = new HttpErrorResponse({
      status: 401,
      error: { code: 'AUTH_REQUIRED' },
    });

    const response$ = runInInjectionContext(injector, () =>
      errorInterceptor(request, () => throwError(() => error)),
    );

    response$.subscribe({ error: () => undefined });
    response$.subscribe({ error: () => undefined });

    assert.equal(expireSession.mock.callCount(), 2);
    assert.equal(logout.mock.callCount(), 1);
    assert.equal(show.mock.callCount(), 1);
    assert.equal(navigate.mock.callCount(), 1);
  });

  it('leaves session validation errors for the auth service to handle', () => {
    const expireSession = mock.fn(() => true);
    const show = mock.fn();
    const navigate = mock.fn(() => Promise.resolve(true));
    const injector = Injector.create({
      providers: [
        { provide: AuthService, useValue: { expireSession } },
        { provide: Router, useValue: { navigate } },
        { provide: ToastService, useValue: { show } },
      ],
    });
    const request = new HttpRequest('GET', '/api/auth/session');
    const error = new HttpErrorResponse({
      status: 401,
      error: { code: 'INVALID_TOKEN' },
    });

    const response$ = runInInjectionContext(injector, () =>
      errorInterceptor(request, () => throwError(() => error)),
    );

    response$.subscribe({ error: () => undefined });

    assert.equal(expireSession.mock.callCount(), 0);
    assert.equal(show.mock.callCount(), 0);
    assert.equal(navigate.mock.callCount(), 0);
  });
});
