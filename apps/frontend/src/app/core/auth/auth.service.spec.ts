import '@angular/compiler';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { of, throwError } from 'rxjs';
import { SKIP_GLOBAL_ERROR_TOAST } from '../interceptors/error-toast.token';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

describe('AuthService', () => {
  let originalSessionStorage: Storage | undefined;
  let originalLocalStorage: Storage | undefined;

  beforeEach(() => {
    originalSessionStorage = globalThis.sessionStorage;
    originalLocalStorage = globalThis.localStorage;
    Object.assign(globalThis, {
      sessionStorage: new MemoryStorage(),
      localStorage: new MemoryStorage(),
    });
  });

  afterEach(() => {
    Object.assign(globalThis, {
      sessionStorage: originalSessionStorage,
      localStorage: originalLocalStorage,
    });
  });

  it('requests a password reset with normalized email and skips duplicate global error toasts', async () => {
    const post = mock.fn(() => of({ success: true }));

    const injector = Injector.create({
      providers: [
        AuthService,
        {
          provide: HttpClient,
          useValue: { post },
        },
      ],
    });

    const service = runInInjectionContext(injector, () => new AuthService());

    const result = await service.forgotPassword({ email: ' maria@example.org ' });

    assert.deepEqual(result, { success: true });
    assert.equal(post.mock.callCount(), 1);
    const [url, body, options] = post.mock.calls[0]!.arguments as [
      string,
      { email: string },
      { context: HttpContext },
    ];
    assert.equal(url, `${environment.apiBaseUrl}/auth/forgot-password`);
    assert.deepEqual(body, { email: 'maria@example.org' });
    assert.equal(options.context.get(SKIP_GLOBAL_ERROR_TOAST), true);
  });

  it('returns a generic error result when password reset email fails', async () => {
    const post = mock.fn(() => throwError(() => new Error('network failed')));

    const injector = Injector.create({
      providers: [
        AuthService,
        {
          provide: HttpClient,
          useValue: { post },
        },
      ],
    });
    const service = runInInjectionContext(injector, () => new AuthService());

    const result = await service.forgotPassword({ email: 'maria@example.org' });

    assert.deepEqual(result, {
      success: false,
      message: 'errors.requestFailed',
    });
  });

  it('resets the password with the token and skips duplicate global error toasts', async () => {
    const post = mock.fn(() => of({ success: true }));

    const injector = Injector.create({
      providers: [
        AuthService,
        {
          provide: HttpClient,
          useValue: { post },
        },
      ],
    });

    const service = runInInjectionContext(injector, () => new AuthService());

    const result = await service.resetPassword({
      token: 'reset-token',
      newPassword: 'NewPassword1!',
    });

    assert.deepEqual(result, { success: true });
    assert.equal(post.mock.callCount(), 1);
    const [url, body, options] = post.mock.calls[0]!.arguments as [
      string,
      { token: string; newPassword: string },
      { context: HttpContext },
    ];
    assert.equal(url, `${environment.apiBaseUrl}/auth/reset-password`);
    assert.deepEqual(body, {
      token: 'reset-token',
      newPassword: 'NewPassword1!',
    });
    assert.equal(options.context.get(SKIP_GLOBAL_ERROR_TOAST), true);
  });

  it('maps an invalid reset token response to the reset-link error', async () => {
    const post = mock.fn(() =>
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { code: 'PASSWORD_RESET_TOKEN_INVALID' },
          }),
      ),
    );

    const injector = Injector.create({
      providers: [
        AuthService,
        {
          provide: HttpClient,
          useValue: { post },
        },
      ],
    });
    const service = runInInjectionContext(injector, () => new AuthService());

    const result = await service.resetPassword({
      token: 'expired-token',
      newPassword: 'NewPassword1!',
    });

    assert.deepEqual(result, {
      success: false,
      message: 'auth.resetPasswordTokenInvalid',
    });
  });

  it('refreshes a stored session from the API', async () => {
    sessionStorage.setItem(
      'solidarity-network-auth-session',
      JSON.stringify({
        id: 'old-id',
        username: 'maria',
        email: 'maria@example.org',
        displayName: 'Maria',
        role: 'case_worker',
        accountType: 'administrator',
        mustChangePassword: false,
        csrfToken: 'old-csrf',
      }),
    );
    const get = mock.fn(() =>
      of({
        csrfToken: 'new-csrf',
        user: {
          id: 'new-id',
          username: 'maria',
          email: 'maria@example.org',
          name: 'Maria Silva',
          role: 'case_worker',
          accountType: 'administrator',
          mustChangePassword: false,
        },
      }),
    );

    const injector = Injector.create({
      providers: [
        AuthService,
        { provide: HttpClient, useValue: { get } },
      ],
    });
    const service = runInInjectionContext(injector, () => new AuthService());

    assert.equal(await service.validateStoredSession(), true);
    assert.equal(get.mock.callCount(), 1);
    assert.equal(service.session()?.id, 'new-id');
    assert.equal(service.session()?.csrfToken, 'new-csrf');
  });

  it('restores a valid cookie session when browser storage is empty', async () => {
    const get = mock.fn(() =>
      of({
        csrfToken: 'csrf-token',
        user: {
          id: 'new-id',
          username: 'maria',
          email: 'maria@example.org',
          name: 'Maria Silva',
          role: null,
          accountType: 'beneficiary',
          mustChangePassword: false,
        },
      }),
    );
    const injector = Injector.create({
      providers: [
        AuthService,
        { provide: HttpClient, useValue: { get } },
      ],
    });
    const service = runInInjectionContext(injector, () => new AuthService());

    assert.equal(await service.validateStoredSession(), true);
    assert.equal(service.session()?.accountType, 'beneficiary');
  });

  it('clears a stored session when the API rejects it', async () => {
    sessionStorage.setItem(
      'solidarity-network-auth-session',
      JSON.stringify({
        id: 'old-id',
        username: 'maria',
        email: 'maria@example.org',
        displayName: 'Maria',
        role: null,
        accountType: 'administrator',
        mustChangePassword: false,
        csrfToken: 'old-csrf',
      }),
    );
    const get = mock.fn(() =>
      throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            error: { code: 'INVALID_TOKEN' },
          }),
      ),
    );
    const injector = Injector.create({
      providers: [
        AuthService,
        { provide: HttpClient, useValue: { get } },
      ],
    });
    const service = runInInjectionContext(injector, () => new AuthService());

    assert.equal(await service.validateStoredSession(), false);
    assert.equal(service.session(), null);
    assert.equal(sessionStorage.getItem('solidarity-network-auth-session'), null);
  });

  it('clears the HttpOnly cookie through logout and removes local session data', async () => {
    sessionStorage.setItem(
      'solidarity-network-auth-session',
      JSON.stringify({
        id: 'session-id',
        username: 'maria',
        email: 'maria@example.org',
        displayName: 'Maria',
        role: null,
        accountType: 'administrator',
        mustChangePassword: false,
        csrfToken: 'csrf-token',
      }),
    );
    const post = mock.fn(() => of({ success: true }));
    const injector = Injector.create({
      providers: [
        AuthService,
        { provide: HttpClient, useValue: { post } },
      ],
    });
    const service = runInInjectionContext(injector, () => new AuthService());

    await service.logout();

    assert.equal(post.mock.callCount(), 1);
    assert.equal(
      (post.mock.calls[0]?.arguments[0] as string),
      `${environment.apiBaseUrl}/auth/logout`,
    );
    assert.equal(service.session(), null);
    assert.equal(sessionStorage.getItem('solidarity-network-auth-session'), null);
  });

  it('accepts only internal return URLs after login', () => {
    const injector = Injector.create({
      providers: [
        AuthService,
        { provide: HttpClient, useValue: {} },
      ],
    });
    const service = runInInjectionContext(injector, () => new AuthService());

    assert.equal(service.resolvePostLoginUrl('/beneficiaries'), '/beneficiaries');
    assert.equal(service.resolvePostLoginUrl('https://evil.example'), '/dashboard');
    assert.equal(service.resolvePostLoginUrl('//evil.example'), '/dashboard');
  });

});
