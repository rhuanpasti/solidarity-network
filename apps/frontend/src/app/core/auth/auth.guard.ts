import type { AccountType } from '@solidarity-network/shared';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

const resolveAuthenticatedUrl = (
  authService: AuthService,
  returnUrl?: string | null,
) => {
  const safeReturnUrl =
    returnUrl && !returnUrl.startsWith('/login') ? returnUrl : undefined;

  return authService.resolvePostLoginUrl(safeReturnUrl);
};

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

    const allowedAccountTypes = _route.data?.['accountTypes'] as
      | AccountType[]
      | undefined;

    if (
      allowedAccountTypes?.length &&
      authService.session() &&
      !allowedAccountTypes.includes(authService.session()!.accountType)
    ) {
      return router.createUrlTree([authService.resolveHomeUrl()]);
    }

    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};

export const loginGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree([
    resolveAuthenticatedUrl(authService, route.queryParamMap.get('returnUrl')),
  ]);
};
