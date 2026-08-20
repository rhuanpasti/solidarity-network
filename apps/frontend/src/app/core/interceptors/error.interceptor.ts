import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { TimeoutError, catchError, throwError } from 'rxjs';
import type { ApiErrorResponse } from '@solidarity-network/shared';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../services/toast.service';
import { getApiErrorToast } from './error-message.utils';
import { SKIP_GLOBAL_ERROR_TOAST } from './error-toast.token';

const sessionErrorCodes: readonly string[] = [
  'AUTH_REQUIRED',
  'INVALID_TOKEN',
  'AUTH_ACCOUNT_UNAVAILABLE',
  'SESSION_REVOKED',
  'CSRF_TOKEN_INVALID',
];

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);

  return next(request).pipe(
    catchError((error: HttpErrorResponse | TimeoutError) => {
      if (error instanceof TimeoutError || error.status === 0) {
        return throwError(() => error);
      }

      const payload = error.error as ApiErrorResponse | undefined;
      const code = payload?.code;

      if (code === 'PASSWORD_CHANGE_REQUIRED') {
        authService.markPasswordChangeRequired();
        void router.navigate(['/first-access']);
        return throwError(() => error);
      }

      if (code === 'ACCOUNT_TYPE_NOT_ALLOWED') {
        void router.navigateByUrl(authService.resolveHomeUrl());
        return throwError(() => error);
      }

      if (code === 'ADMINISTRATOR_ROLE_NOT_ALLOWED') {
        void router.navigateByUrl(authService.resolveHomeUrl());
        return throwError(() => error);
      }

      if (code && sessionErrorCodes.includes(code)) {
        if (request.url.includes('/auth/session')) {
          return throwError(() => error);
        }

        if (authService.expireSession()) {
          // The auth token is an HttpOnly cookie, so clear it through the
          // public logout endpoint instead of trying to access it in JS.
          toastService.show({
            type: 'error',
            translationKey: 'auth.sessionExpired',
          });
          void authService.logout().then(() => router.navigate(['/login']));
        }
        return throwError(() => error);
      }

      if (request.url.includes('/auth/login') || request.url.includes('/auth/change-password')) {
        return throwError(() => error);
      }

      if (!request.context.get(SKIP_GLOBAL_ERROR_TOAST)) {
        toastService.show(getApiErrorToast(error, payload));
      }

      return throwError(() => error);
    }),
  );
};
