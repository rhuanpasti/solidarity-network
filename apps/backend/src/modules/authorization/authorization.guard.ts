import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { AuthorizationService } from './authorization.service';
import { AUTHORIZATION_ROUTE_POLICY_KEY } from './authorization.decorators';
import type { AuthorizationRoutePolicy } from './authorization.types';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(AuthorizationService)
    private readonly authorizationService: AuthorizationService,
  ) {}

  canActivate(context: ExecutionContext) {
    const policy = this.reflector.getAllAndOverride<AuthorizationRoutePolicy>(
      AUTHORIZATION_ROUTE_POLICY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!policy) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    this.authorizationService.assertRoutePolicy(request.authUser, policy, {
      method: request.method,
      path: request.route?.path ?? request.url,
    });

    return true;
  }
}

