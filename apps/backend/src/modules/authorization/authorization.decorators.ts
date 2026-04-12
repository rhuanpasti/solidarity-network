import { SetMetadata } from '@nestjs/common';
import type { AuthorizationRoutePolicy } from './authorization.types';

export const AUTHORIZATION_ROUTE_POLICY_KEY = 'authorizationRoutePolicy';

export const AuthorizeRoute = (policy: AuthorizationRoutePolicy) =>
  SetMetadata(AUTHORIZATION_ROUTE_POLICY_KEY, policy);

