import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TimeoutError, catchError, throwError, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BackendAvailabilityService } from '../services/backend-availability.service';

export const BACKEND_REQUEST_TIMEOUT_MS = 20_000;

function isBackendRequest(url: string) {
  return url.startsWith(environment.apiBaseUrl);
}

export function createBackendTimeoutInterceptor(
  timeoutMs = BACKEND_REQUEST_TIMEOUT_MS,
): HttpInterceptorFn {
  return (request, next) => {
    if (!isBackendRequest(request.url)) {
      return next(request);
    }

    const backendAvailabilityService = inject(BackendAvailabilityService);

    return next(request).pipe(
      timeout({ first: timeoutMs }),
      catchError((error: unknown) => {
        if (error instanceof TimeoutError || (error instanceof HttpErrorResponse && error.status === 0)) {
          backendAvailabilityService.markUnavailable();
        }

        return throwError(() => error);
      }),
    );
  };
}

export const backendTimeoutInterceptor = createBackendTimeoutInterceptor();
