import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import {
  AuthorizationRoutePolicy,
  type ProgramAccessScope,
  type AuthorizationRoutePolicy as RoutePolicy,
} from './authorization.types';

@Injectable()
export class AuthorizationService {
  constructor(private readonly logger: StructuredLoggerService) {}

  getProgramScope(user: AuthenticatedUser): ProgramAccessScope {
    if (user.accountType !== 'administrator') {
      return {
        hasGlobalAccess: false,
        allowedProgramIds: [],
      };
    }

    if (this.isSuperAdmin(user)) {
      return {
        hasGlobalAccess: true,
        allowedProgramIds: [],
      };
    }

    return {
      hasGlobalAccess: false,
      allowedProgramIds: Array.from(new Set(user.programIds)),
    };
  }

  canAccessRoutePolicy(user: AuthenticatedUser, policy: RoutePolicy) {
    switch (policy) {
      case AuthorizationRoutePolicy.ViewAdministrators:
        return user.accountType === 'administrator';
      case AuthorizationRoutePolicy.ManageAdministrators:
        return this.canManageAdministrator(user);
      case AuthorizationRoutePolicy.CreateCharityProgram:
        return this.canCreateCharityProgram(user);
      case AuthorizationRoutePolicy.AccessPrograms:
      case AuthorizationRoutePolicy.ManageBenefits:
      case AuthorizationRoutePolicy.ManageBeneficiaries:
      case AuthorizationRoutePolicy.ManageDeliveries:
        return user.accountType === 'administrator';
      case AuthorizationRoutePolicy.AccessBeneficiaryPortal:
        return user.accountType === 'beneficiary';
      default:
        return false;
    }
  }

  canViewAdministrator(
    user: AuthenticatedUser,
    targetProgramIds: string[],
  ) {
    if (user.accountType !== 'administrator') {
      return false;
    }

    if (this.isSuperAdmin(user)) {
      return true;
    }

    if (!targetProgramIds.length) {
      return false;
    }

    return targetProgramIds.some((programId) => user.programIds.includes(programId));
  }

  canManageAdministrator(user: AuthenticatedUser) {
    return this.isSuperAdmin(user);
  }

  canCreateCharityProgram(user: AuthenticatedUser) {
    return this.isSuperAdmin(user);
  }

  canAccessProgram(user: AuthenticatedUser, programId?: string | null) {
    if (user.accountType !== 'administrator') {
      return false;
    }

    if (this.isSuperAdmin(user)) {
      return true;
    }

    return Boolean(programId && user.programIds.includes(programId));
  }

  canEditBeneficiary(
    user: AuthenticatedUser,
    programIds?: string[] | null,
  ) {
    if (user.accountType !== 'administrator') {
      return false;
    }

    if (this.isSuperAdmin(user)) {
      return true;
    }

    if (!programIds?.length) {
      return false;
    }

    return programIds.some((programId) => user.programIds.includes(programId));
  }

  canRegisterDelivery(user: AuthenticatedUser, programId: string) {
    return this.canAccessProgram(user, programId);
  }

  canManageBenefit(user: AuthenticatedUser) {
    return user.accountType === 'administrator';
  }

  assertRoutePolicy(
    user: AuthenticatedUser,
    policy: RoutePolicy,
    details?: Record<string, unknown>,
  ) {
    if (this.canAccessRoutePolicy(user, policy)) {
      return;
    }

    this.logFailure(policy, user, details);
    throw new ForbiddenException({
      code: 'ROUTE_POLICY_FORBIDDEN',
      message: 'Authenticated account cannot access this route.',
    });
  }

  assertCanViewAdministrator(
    user: AuthenticatedUser,
    targetProgramIds: string[],
    details?: Record<string, unknown>,
  ) {
    if (this.canViewAdministrator(user, targetProgramIds)) {
      return;
    }

    this.logFailure('canViewAdministrator', user, {
      ...details,
      targetProgramIds,
    });
    throw new ForbiddenException({
      code: 'ADMINISTRATOR_VIEW_FORBIDDEN',
      message: 'Authenticated account cannot view this administrator.',
    });
  }

  assertCanManageAdministrator(
    user: AuthenticatedUser,
    details?: Record<string, unknown>,
  ) {
    if (this.canManageAdministrator(user)) {
      return;
    }

    this.logFailure('canManageAdministrator', user, details);
    throw new ForbiddenException({
      code: 'ADMINISTRATOR_MANAGEMENT_FORBIDDEN',
      message: 'Authenticated account cannot manage administrators.',
    });
  }

  assertCanCreateCharityProgram(
    user: AuthenticatedUser,
    details?: Record<string, unknown>,
  ) {
    if (this.canCreateCharityProgram(user)) {
      return;
    }

    this.logFailure('canCreateCharityProgram', user, details);
    throw new ForbiddenException({
      code: 'CHARITY_PROGRAM_CREATE_FORBIDDEN',
      message: 'Authenticated account cannot create charity programs.',
    });
  }

  assertCanAccessProgram(
    user: AuthenticatedUser,
    programId?: string | null,
    details?: Record<string, unknown>,
  ) {
    if (this.canAccessProgram(user, programId)) {
      return;
    }

    this.logFailure('canAccessProgram', user, {
      ...details,
      programId,
    });
    throw new ForbiddenException({
      code: 'PROGRAM_ACCESS_FORBIDDEN',
      message: 'Authenticated account cannot access this charity program.',
    });
  }

  assertCanEditBeneficiary(
    user: AuthenticatedUser,
    programIds?: string[] | null,
    details?: Record<string, unknown>,
  ) {
    if (this.canEditBeneficiary(user, programIds)) {
      return;
    }

    this.logFailure('canEditBeneficiary', user, {
      ...details,
      programIds,
    });
    throw new ForbiddenException({
      code: 'BENEFICIARY_EDIT_FORBIDDEN',
      message: 'Authenticated account cannot edit this beneficiary.',
    });
  }

  assertCanRegisterDelivery(
    user: AuthenticatedUser,
    programId: string,
    details?: Record<string, unknown>,
  ) {
    if (this.canRegisterDelivery(user, programId)) {
      return;
    }

    this.logFailure('canRegisterDelivery', user, {
      ...details,
      programId,
    });
    throw new ForbiddenException({
      code: 'DELIVERY_REGISTRATION_FORBIDDEN',
      message: 'Authenticated account cannot register deliveries for this program.',
    });
  }

  assertCanManageBenefit(
    user: AuthenticatedUser,
    details?: Record<string, unknown>,
  ) {
    if (this.canManageBenefit(user)) {
      return;
    }

    this.logFailure('canManageBenefit', user, details);
    throw new ForbiddenException({
      code: 'BENEFIT_MANAGEMENT_FORBIDDEN',
      message: 'Authenticated account cannot manage benefits.',
    });
  }

  private isSuperAdmin(user: AuthenticatedUser) {
    return user.accountType === 'administrator' && user.role === 'super_admin';
  }

  private logFailure(
    policy: string,
    user: AuthenticatedUser,
    details?: Record<string, unknown>,
  ) {
    this.logger.warn('authorization.denied', {
      event: 'authorization.denied',
      policy,
      timestamp: new Date().toISOString(),
      accountId: user.sub,
      accountType: user.accountType,
      role: user.role,
      programIds: user.programIds,
      ...details,
    });
  }
}
