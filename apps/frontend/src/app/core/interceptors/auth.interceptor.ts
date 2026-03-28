import { HttpInterceptorFn } from '@angular/common/http';
import { readStoredAuthToken } from '../auth/auth.storage';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = readStoredAuthToken();

  if (!token) {
    return next(request);
  }


  
  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
};
