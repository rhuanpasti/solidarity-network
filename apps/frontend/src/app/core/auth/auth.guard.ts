import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    if (
      authService.requiresPasswordChange() &&
      !state.url.startsWith('/first-access')
    ) {
      return router.createUrlTree(['/first-access']);
    }

    if (
      !authService.requiresPasswordChange() &&
      state.url.startsWith('/first-access')
    ) {
      return router.createUrlTree(['/dashboard']);
    }

    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
