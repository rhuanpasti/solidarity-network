import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import type { ApiErrorResponse } from '@solidarity-network/shared';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../services/toast.service';
import { getApiErrorToast } from './error-message.utils';
import { SKIP_GLOBAL_ERROR_TOAST } from './error-toast.token';

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      const payload = error.error as ApiErrorResponse | undefined;

      if (payload?.code === 'PASSWORD_CHANGE_REQUIRED') {
        authService.markPasswordChangeRequired();
        void router.navigate(['/first-access']);
        return throwError(() => error);
      }

      if (payload?.code === 'ACCOUNT_TYPE_NOT_ALLOWED') {
        void router.navigateByUrl(authService.resolveHomeUrl());
        return throwError(() => error);
      }

      if (payload?.code === 'ADMINISTRATOR_ROLE_NOT_ALLOWED') {
        void router.navigateByUrl(authService.resolveHomeUrl());
        return throwError(() => error);
      }

      if (
        payload?.code === 'AUTH_REQUIRED' ||
        payload?.code === 'INVALID_TOKEN' ||
        payload?.code === 'AUTH_ACCOUNT_UNAVAILABLE' ||
        payload?.code === 'CSRF_TOKEN_INVALID'
      ) {
        if (authService.expireSession()) {
          toastService.show({
            type: 'error',
            translationKey: 'auth.sessionExpired',
          });
          void router.navigate(['/login']);
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
