import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccountType } from '@solidarity-network/shared';
import { environment } from '../../../environments/environment';
import {
  clearStoredAuthSession,
  isSessionStoredInLocalStorage,
  persistAuthSession,
  readStoredAuthSession,
  type AuthSession,
} from './auth.storage';

export interface LoginPayload {
  identifier: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginResult {
  success: boolean;
  message?: string;
  mustChangePassword?: boolean;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

interface AuthApiResponse {
  token: string;
  user: {
    id: string;
    username: string;
    name: string;
    email: string;
    role: string | null;
    accountType: AccountType;
    mustChangePassword: boolean;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;
  private readonly sessionState = signal<AuthSession | null>(readStoredAuthSession());

  readonly session = computed(() => this.sessionState());
  readonly currentUser = computed(() => this.sessionState());
  readonly isAuthenticated = computed(() => this.sessionState() !== null);
  readonly requiresPasswordChange = computed(
    () => this.sessionState()?.mustChangePassword ?? false,
  );

  async login(payload: LoginPayload): Promise<LoginResult> {
    try {
      const response = await firstValueFrom(
        this.httpClient.post<AuthApiResponse>(`${this.baseUrl}/login`, {
          identifier: payload.identifier.trim(),
          password: payload.password,
        }),
      );

      const session: AuthSession = {
        id: response.user.id,
        username: response.user.username,
        email: response.user.email,
        displayName: response.user.name,
        role: response.user.role,
        accountType: response.user.accountType,
        token: response.token,
        mustChangePassword: response.user.mustChangePassword,
      };

      persistAuthSession(session, payload.rememberMe);
      this.sessionState.set(session);

      return {
        success: true,
        mustChangePassword: session.mustChangePassword,
      };
    } catch (error) {
      return {
        success: false,
        message: this.resolveAuthErrorKey(error, 'auth.invalidCredentials'),
      };
    }
  }

  async changePassword(payload: ChangePasswordPayload): Promise<LoginResult> {
    try {
      const response = await firstValueFrom(
        this.httpClient.post<AuthApiResponse>(`${this.baseUrl}/change-password`, payload),
      );

      const session: AuthSession = {
        id: response.user.id,
        username: response.user.username,
        email: response.user.email,
        displayName: response.user.name,
        role: response.user.role,
        accountType: response.user.accountType,
        token: response.token,
        mustChangePassword: response.user.mustChangePassword,
      };

      persistAuthSession(session, isSessionStoredInLocalStorage());
      this.sessionState.set(session);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: this.resolveAuthErrorKey(error, 'auth.invalidCurrentPassword'),
      };
    }
  }

  logout() {
    clearStoredAuthSession();
    this.sessionState.set(null);
  }

  markPasswordChangeRequired() {
    const session = this.sessionState();

    if (!session) {
      return;
    }

    const nextSession = {
      ...session,
      mustChangePassword: true,
    };

    persistAuthSession(nextSession, isSessionStoredInLocalStorage());
    this.sessionState.set(nextSession);
  }

  resolvePostLoginUrl(returnUrl?: string | null) {
    if (this.requiresPasswordChange()) {
      return '/first-access';
    }

    return returnUrl || this.resolveHomeUrl();
  }

  resolveHomeUrl() {
    return this.sessionState()?.accountType === AccountType.Beneficiary
      ? '/my-programs'
      : '/dashboard';
  }

  private resolveAuthErrorKey(error: unknown, fallback: string) {
    if (!(error instanceof HttpErrorResponse)) {
      return fallback;
    }

    const code = (error.error as { code?: string } | undefined)?.code;

    switch (code) {
      case 'INVALID_CREDENTIALS':
        return 'auth.invalidCredentials';
      case 'INVALID_CURRENT_PASSWORD':
        return 'auth.invalidCurrentPassword';
      case 'PASSWORD_REUSE_NOT_ALLOWED':
        return 'auth.passwordReuseNotAllowed';
      default:
        return fallback;
    }
  }
}
