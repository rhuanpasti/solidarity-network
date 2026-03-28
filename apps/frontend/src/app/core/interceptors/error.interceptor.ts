import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import type { ApiErrorResponse } from '@solidarity-network/shared';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const toastService = inject(ToastService);

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      const payload = error.error as ApiErrorResponse | undefined;
      toastService.show({
        type: 'error',
        text: payload?.message ?? 'Request failed. Please try again.',
      });

      return throwError(() => error);
    }),
  );
};

