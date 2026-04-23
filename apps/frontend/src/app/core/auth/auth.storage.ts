import type { AccountType } from '@solidarity-network/shared';

export interface AuthSession {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: string | null;
  accountType: AccountType;
  mustChangePassword: boolean;
  csrfToken: string;
}

export const AUTH_SESSION_STORAGE_KEY = 'solidarity-network-auth-session';

function getAvailableStorages() {
  const storages: Storage[] = [];

  for (const key of ['sessionStorage', 'localStorage'] as const) {
    try {
      const storage = globalThis[key];

      if (storage) {
        storages.push(storage);
      }
    } catch {
      // Storage can be unavailable in SSR, private modes, or locked-down browsers.
    }
  }

  return storages;
}

export function readStoredAuthSession(): AuthSession | null {
  for (const storage of getAvailableStorages()) {
    let raw: string | null;

    try {
      raw = storage.getItem(AUTH_SESSION_STORAGE_KEY);
    } catch {
      continue;
    }

    if (!raw) {
      continue;
    }

    try {
      const session = JSON.parse(raw) as Partial<AuthSession>;

      if (
        !session.id ||
        !session.username ||
        !session.email ||
        !session.displayName ||
        !session.csrfToken
      ) {
        safeRemoveItem(storage);
        continue;
      }

      return {
        id: session.id,
        username: session.username,
        email: session.email,
        displayName: session.displayName,
        role: session.role ?? null,
        accountType: session.accountType ?? 'administrator',
        mustChangePassword: session.mustChangePassword ?? false,
        csrfToken: session.csrfToken,
      };
    } catch {
      safeRemoveItem(storage);
    }
  }

  return null;
}

export function persistAuthSession(session: AuthSession, rememberMe: boolean) {
  clearStoredAuthSession();

  const serializedSession = JSON.stringify(session);
  const [sessionStore, localStore] = getAvailableStorages();
  const preferredStorage = rememberMe ? localStore : sessionStore;
  const fallbackStorage = rememberMe ? sessionStore : localStore;

  if (safeSetItem(preferredStorage, serializedSession)) {
    return;
  }

  safeSetItem(fallbackStorage, serializedSession);
}

export function isSessionStoredInLocalStorage() {
  try {
    return Boolean(globalThis.localStorage?.getItem(AUTH_SESSION_STORAGE_KEY));
  } catch {
    return false;
  }
}

export function clearStoredAuthSession() {
  for (const storage of getAvailableStorages()) {
    safeRemoveItem(storage);
  }
}

function safeSetItem(storage: Storage | undefined, value: string) {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(AUTH_SESSION_STORAGE_KEY, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveItem(storage: Storage) {
  try {
    storage.removeItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    // Best effort cleanup only.
  }
}
