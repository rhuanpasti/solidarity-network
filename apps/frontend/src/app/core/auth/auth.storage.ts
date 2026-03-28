export interface AuthSession {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: string;
  token: string;
  mustChangePassword: boolean;
}

export const AUTH_TOKEN_STORAGE_KEY = 'solidarity-network-auth-token';
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
      return JSON.parse(raw) as AuthSession;
    } catch {
      storage.removeItem(AUTH_SESSION_STORAGE_KEY);
    }
  }

  return null;
}

export function readStoredAuthToken(): string | null {
  const session = readStoredAuthSession();

  if (session?.token) {
    return session.token;
  }

  for (const storage of getAvailableStorages()) {
    const token = storage.getItem(AUTH_TOKEN_STORAGE_KEY);

    if (token) {
      return token;
    }
  }

  return null;
}

export function persistAuthSession(session: AuthSession, rememberMe: boolean) {
  clearStoredAuthSession();

  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(AUTH_TOKEN_STORAGE_KEY, session.token);
  storage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function isSessionStoredInLocalStorage() {
  return Boolean(localStorage.getItem(AUTH_SESSION_STORAGE_KEY));
}

export function clearStoredAuthSession() {
  for (const storage of getAvailableStorages()) {
    storage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    storage.removeItem(AUTH_SESSION_STORAGE_KEY);
  }
}
