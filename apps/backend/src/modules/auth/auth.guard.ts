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
  ALLOW_PASSWORD_CHANGE_WHEN_REQUIRED_KEY,
  IS_PUBLIC_KEY,
} from './auth.decorators';
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
    @Inject(AuthTokenService)
    private readonly authTokenService: AuthTokenService,
  ) {}

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        message: 'Authentication is required.',
      });
    }

    const token = authorization.slice('Bearer '.length);
    const user = this.authTokenService.verify(token);

    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Authentication token is invalid or expired.',
      });
    }

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

    if (user.mustChangePassword && !allowPasswordChangeWhenRequired) {
      throw new ForbiddenException({
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Password change required before accessing this resource.',
      });
    }

    if (allowedAccountTypes.length && !allowedAccountTypes.includes(user.accountType)) {
      throw new ForbiddenException({
        code: 'ACCOUNT_TYPE_NOT_ALLOWED',
        message: 'Authenticated account cannot access this resource.',
      });
    }

    request.authUser = user;

    return true;
  }
}
