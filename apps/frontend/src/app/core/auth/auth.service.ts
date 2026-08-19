import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import type { AccountType, AuthUserSummary } from '@solidarity-network/shared';
import { environment } from '../../../environments/environment';
import { SKIP_GLOBAL_ERROR_TOAST } from '../interceptors/error-toast.token';
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

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

interface AuthApiResponse {
  token?: string;
  csrfToken: string;
  user: AuthUserSummary;
}

interface SessionApiResponse {
  csrfToken: string;
  user: AuthUserSummary;
}

const SESSION_VALIDATION_TIMEOUT_MS = 10_000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;
  private readonly sessionState = signal<AuthSession | null>(readStoredAuthSession());
  private sessionExpiryHandled = false;

  readonly session = computed(() => this.sessionState());
  readonly currentUser = computed(() => this.sessionState());
  readonly isAuthenticated = computed(() => this.sessionState() !== null);
  readonly requiresPasswordChange = computed(
    () => this.sessionState()?.mustChangePassword ?? false,
  );

  async validateStoredSession() {
    try {
      const response = await firstValueFrom(
        this.httpClient
          .get<SessionApiResponse>(`${this.baseUrl}/session`)
          .pipe(timeout({ first: SESSION_VALIDATION_TIMEOUT_MS })),
      );

      this.persistSession(
        this.toAuthSession(response.user, response.csrfToken),
        isSessionStoredInLocalStorage(),
      );
      return true;
    } catch (error) {
      // Keep a locally cached session when the API is unavailable. It can be
      // validated by the next protected request, while an auth failure is
      // cleared immediately so the login page does not get stuck in a loop.
      if (error instanceof HttpErrorResponse && [401, 403].includes(error.status)) {
        this.clearSessionState();
      }

      return false;
    }
  }

  async login(payload: LoginPayload): Promise<LoginResult> {
    try {
      const response = await firstValueFrom(
        this.httpClient.post<AuthApiResponse>(`${this.baseUrl}/login`, {
          identifier: payload.identifier.trim(),
          password: payload.password,
        }),
      );

      const session = this.toAuthSession(response.user, response.csrfToken);

      this.persistSession(session, payload.rememberMe);

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

      this.persistSession(
        this.toAuthSession(response.user, response.csrfToken),
        isSessionStoredInLocalStorage(),
      );

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: this.resolveAuthErrorKey(error, 'auth.invalidCurrentPassword'),
      };
    }
  }

  async forgotPassword(payload: ForgotPasswordPayload): Promise<LoginResult> {
    try {
      await firstValueFrom(
        this.httpClient.post(
          `${this.baseUrl}/forgot-password`,
          { email: payload.email.trim() },
          {
            context: new HttpContext().set(SKIP_GLOBAL_ERROR_TOAST, true),
          },
        ),
      );

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: this.resolveAuthErrorKey(error, 'errors.requestFailed'),
      };
    }
  }

  async resetPassword(payload: ResetPasswordPayload): Promise<LoginResult> {
    try {
      await firstValueFrom(
        this.httpClient.post(
          `${this.baseUrl}/reset-password`,
          payload,
          {
            context: new HttpContext().set(SKIP_GLOBAL_ERROR_TOAST, true),
          },
        ),
      );

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: this.resolveAuthErrorKey(
          error,
          'auth.resetPasswordTokenInvalid',
        ),
      };
    }
  }


  async logout(options?: { remote?: boolean }) {
    const remote = options?.remote ?? true;

    try {
      if (remote) {
        await firstValueFrom(this.httpClient.post(`${this.baseUrl}/logout`, {}));
      }
    } catch {
      console.error('Logout request failed, clearing local session state anyway.');
    } finally {
      this.sessionExpiryHandled = false;
      this.clearSessionState();
    }
  }

  expireSession() {
    if (this.sessionExpiryHandled) {
      return false;
    }

    this.sessionExpiryHandled = true;
    this.clearSessionState();
    return true;
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

    this.persistSession(nextSession, isSessionStoredInLocalStorage());
  }

  resolvePostLoginUrl(returnUrl?: string | null) {
    if (this.requiresPasswordChange()) {
      return '/first-access';
    }

    const safeReturnUrl =
      returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') && !returnUrl.startsWith('/login')
        ? returnUrl
        : undefined;

    return safeReturnUrl || this.resolveHomeUrl();
  }

  resolveHomeUrl() {
    return this.sessionState()?.accountType === 'beneficiary'
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
      case 'PASSWORD_RESET_TOKEN_INVALID':
        return 'auth.resetPasswordTokenInvalid';
      case 'TOO_MANY_LOGIN_ATTEMPTS':
        return 'auth.tooManyLoginAttempts';
      default:
        return fallback;
    }
  }

  private toAuthSession(user: AuthUserSummary, csrfToken: string): AuthSession {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.name,
      role: user.role,
      accountType: user.accountType as AccountType,
      mustChangePassword: user.mustChangePassword,
      csrfToken,
    };
  }

  private persistSession(session: AuthSession, rememberMe: boolean) {
    persistAuthSession(session, rememberMe);
    this.sessionState.set(session);
    this.sessionExpiryHandled = false;
  }

  private clearSessionState() {
    clearStoredAuthSession();
    this.sessionState.set(null);
  }
}
