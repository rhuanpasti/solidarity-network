import { HttpInterceptorFn } from '@angular/common/http';
import { readStoredAuthSession } from '../auth/auth.storage';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = readStoredAuthSession();

  return next(
    request.clone({
      withCredentials: true,
      setHeaders: session?.csrfToken
        ? {
            'X-CSRF-Token': session.csrfToken,
          }
        : {},
    }),
  );
};
