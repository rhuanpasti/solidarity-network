import '@angular/compiler';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { of, throwError } from 'rxjs';
import { SKIP_GLOBAL_ERROR_TOAST } from '../interceptors/error-toast.token';
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
    assert.equal(url, 'http://localhost:3000/api/v1/auth/forgot-password');
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
});
