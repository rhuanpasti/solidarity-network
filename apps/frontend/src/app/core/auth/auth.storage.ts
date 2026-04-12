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
  return [sessionStorage, localStorage];
}

export function readStoredAuthSession(): AuthSession | null {
  for (const storage of getAvailableStorages()) {
    const raw = storage.getItem(AUTH_SESSION_STORAGE_KEY);

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
        storage.removeItem(AUTH_SESSION_STORAGE_KEY);
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
      storage.removeItem(AUTH_SESSION_STORAGE_KEY);
    }
  }

  return null;
}

export function persistAuthSession(session: AuthSession, rememberMe: boolean) {
  clearStoredAuthSession();

  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function isSessionStoredInLocalStorage() {
  return Boolean(localStorage.getItem(AUTH_SESSION_STORAGE_KEY));
}

export function clearStoredAuthSession() {
  for (const storage of getAvailableStorages()) {
    storage.removeItem(AUTH_SESSION_STORAGE_KEY);
  }
}
