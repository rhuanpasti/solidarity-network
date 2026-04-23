import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTH_SESSION_STORAGE_KEY,
  clearStoredAuthSession,
  isSessionStoredInLocalStorage,
  persistAuthSession,
  readStoredAuthSession,
  type AuthSession,
} from './auth.storage';

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

class ThrowingStorage extends MemoryStorage {
  override getItem() {
    throw new Error('storage unavailable');
  }

  override setItem() {
    throw new Error('storage unavailable');
  }

  override removeItem() {
    throw new Error('storage unavailable');
  }
}

const session: AuthSession = {
  id: 'admin-1',
  username: 'admin',
  email: 'admin@example.org',
  displayName: 'Admin',
  role: 'super_admin',
  accountType: 'administrator',
  mustChangePassword: false,
  csrfToken: 'csrf',
};

describe('auth storage', () => {
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

  it('persists remember-me sessions in local storage and clears session storage', () => {
    sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ stale: true }));

    persistAuthSession(session, true);

    assert.equal(sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY), null);
    assert.deepEqual(readStoredAuthSession(), session);
    assert.equal(isSessionStoredInLocalStorage(), true);
  });

  it('persists non-remember-me sessions in session storage', () => {
    persistAuthSession({ ...session, mustChangePassword: true }, false);

    assert.equal(localStorage.getItem(AUTH_SESSION_STORAGE_KEY), null);
    assert.equal(readStoredAuthSession()?.mustChangePassword, true);
    assert.equal(isSessionStoredInLocalStorage(), false);
  });

  it('removes invalid or malformed stored sessions', () => {
    sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, '{not-json');
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ id: 'missing-fields' }));

    assert.equal(readStoredAuthSession(), null);
    assert.equal(sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY), null);
    assert.equal(localStorage.getItem(AUTH_SESSION_STORAGE_KEY), null);
  });

  it('clears all storage locations', () => {
    sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, 'a');
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, 'b');

    clearStoredAuthSession();

    assert.equal(sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY), null);
    assert.equal(localStorage.getItem(AUTH_SESSION_STORAGE_KEY), null);
  });

  it('does not throw when browser storage is unavailable', () => {
    Reflect.deleteProperty(globalThis, 'sessionStorage');
    Reflect.deleteProperty(globalThis, 'localStorage');

    assert.doesNotThrow(() => readStoredAuthSession());
    assert.equal(readStoredAuthSession(), null);
    assert.doesNotThrow(() => persistAuthSession(session, true));
    assert.doesNotThrow(() => clearStoredAuthSession());
    assert.equal(isSessionStoredInLocalStorage(), false);
  });

  it('falls back to session storage when remember-me local storage is blocked', () => {
    Object.assign(globalThis, {
      sessionStorage: new MemoryStorage(),
      localStorage: new ThrowingStorage(),
    });

    persistAuthSession(session, true);

    assert.deepEqual(readStoredAuthSession(), session);
    assert.equal(isSessionStoredInLocalStorage(), false);
  });
});
