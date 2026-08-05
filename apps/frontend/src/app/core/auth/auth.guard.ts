import type { AccountType, AdministratorRole } from '@solidarity-network/shared';
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

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  const session = await authService.validateSession();

  if (!session) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

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

  const allowedAccountTypes = route.data?.['accountTypes'] as
    | AccountType[]
    | undefined;
  const allowedAdministratorRoles = route.data?.['administratorRoles'] as
    | AdministratorRole[]
    | undefined;

  if (
    allowedAccountTypes?.length &&
    !allowedAccountTypes.includes(session.accountType)
  ) {
    return router.createUrlTree([authService.resolveHomeUrl()]);
  }

  if (
    allowedAdministratorRoles?.length &&
    (session.accountType !== 'administrator' ||
      !session.role ||
      !allowedAdministratorRoles.includes(session.role as AdministratorRole))
  ) {
    return router.createUrlTree([authService.resolveHomeUrl()]);
  }

  return true;
};

export const loginGuard: CanActivateFn = async (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const resetToken = route.queryParamMap.get('token');

  if (resetToken) {
    return router.createUrlTree(['/reset-password'], {
      queryParams: { token: resetToken },
    });
  }

  if (!authService.isAuthenticated()) {
    return true;
  }

  const session = await authService.validateSession();

  if (!session) {
    return true;
  }

  return router.createUrlTree([
    resolveAuthenticatedUrl(authService, route.queryParamMap.get('returnUrl')),
  ]);
};
