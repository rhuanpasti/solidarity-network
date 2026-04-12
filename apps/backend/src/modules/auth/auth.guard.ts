import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  ACCOUNT_TYPES_KEY,
  ADMINISTRATOR_ROLES_KEY,
  ALLOW_PASSWORD_CHANGE_WHEN_REQUIRED_KEY,
  IS_PUBLIC_KEY,
} from './auth.decorators';
import { extractAuthToken } from './auth-cookie.util';
import { AuthRepository } from './auth.repository';
import { AuthTokenService } from './auth-token.service';
import type { AuthenticatedUser } from './auth.types';

export interface AuthenticatedRequest extends Request {
  authUser: AuthenticatedUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(AuthRepository)
    private readonly authRepository: AuthRepository,
    @Inject(AuthTokenService)
    private readonly authTokenService: AuthTokenService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authToken = extractAuthToken(request as Request);

    if (!authToken) {
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        message: 'Authentication is required.',
      });
    }
    const user = this.authTokenService.verify(authToken.token);

    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Authentication token is invalid or expired.',
      });
    }

    const currentUser = await this.authRepository.findAuthenticatedUser(
      user.accountType,
      user.sub,
    );

    if (!currentUser) {
      throw new UnauthorizedException({
        code: 'AUTH_ACCOUNT_UNAVAILABLE',
        message: 'Authenticated account is no longer available.',
      });
    }

    const authenticatedUser: AuthenticatedUser = {
      ...currentUser,
      iat: user.iat,
      exp: user.exp,
      csrfToken: user.csrfToken,
    };

    const allowPasswordChangeWhenRequired =
      this.reflector.getAllAndOverride<boolean>(
        ALLOW_PASSWORD_CHANGE_WHEN_REQUIRED_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? false;
    const allowedAccountTypes =
      this.reflector.getAllAndOverride<AuthenticatedUser['accountType'][]>(
        ACCOUNT_TYPES_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];
    const allowedAdministratorRoles =
      this.reflector.getAllAndOverride<AuthenticatedUser['role'][]>(
        ADMINISTRATOR_ROLES_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    if (
      authenticatedUser.mustChangePassword &&
      !allowPasswordChangeWhenRequired
    ) {
      throw new ForbiddenException({
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Password change required before accessing this resource.',
      });
    }

    if (
      allowedAccountTypes.length &&
      !allowedAccountTypes.includes(authenticatedUser.accountType)
    ) {
      throw new ForbiddenException({
        code: 'ACCOUNT_TYPE_NOT_ALLOWED',
        message: 'Authenticated account cannot access this resource.',
      });
    }

    if (
      allowedAdministratorRoles.length &&
      (authenticatedUser.accountType !== 'administrator' ||
        !authenticatedUser.role ||
        !allowedAdministratorRoles.includes(authenticatedUser.role))
    ) {
      throw new ForbiddenException({
        code: 'ADMINISTRATOR_ROLE_NOT_ALLOWED',
        message: 'Administrator role cannot access this resource.',
      });
    }

    if (
      authToken.source === 'cookie' &&
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())
    ) {
      const csrfHeader = request.headers['x-csrf-token'];
      const csrfToken = Array.isArray(csrfHeader) ? csrfHeader[0] : csrfHeader;

      if (!csrfToken || csrfToken !== authenticatedUser.csrfToken) {
        throw new ForbiddenException({
          code: 'CSRF_TOKEN_INVALID',
          message: 'CSRF token is missing or invalid.',
        });
      }
    }

    request.authUser = authenticatedUser;

    return true;
  }
}
