import { ForbiddenException } from '@nestjs/common';
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { AuthorizationService } from './authorization.service';
import { AuthorizationRoutePolicy } from './authorization.types';
import type { AuthenticatedUser } from '../auth/auth.types';

const logger = { warn: mock.fn() };
const service = new AuthorizationService(logger as never);

const superAdmin: AuthenticatedUser = {
  sub: 'admin-1',
  username: 'root',
  name: 'Root',
  email: 'root@example.org',
  role: 'super_admin',
  accountType: 'administrator',
  programIds: [],
  mustChangePassword: false,
  sessionVersion: 0,
  csrfToken: 'csrf',
  iat: 0,
  exp: 0,
};

const programManager: AuthenticatedUser = {
  ...superAdmin,
  sub: 'admin-2',
  username: 'manager',
  role: 'program_manager',
  programIds: ['program-a', 'program-a', 'program-b'],
};

const caseWorker: AuthenticatedUser = {
  ...programManager,
  sub: 'admin-3',
  username: 'worker',
  role: 'case_worker',
};

const beneficiary: AuthenticatedUser = {
  ...superAdmin,
  sub: 'beneficiary-1',
  username: 'beneficiary',
  role: null,
  accountType: 'beneficiary',
  programIds: [],
};

describe('AuthorizationService', () => {
  it('deduplicates scoped program access for non-super administrators', () => {
    assert.deepEqual(service.getProgramScope(programManager), {
      hasGlobalAccess: false,
      allowedProgramIds: ['program-a', 'program-b'],
    });
  });

  it('grants global access only to super administrators', () => {
    assert.deepEqual(service.getProgramScope(superAdmin), {
      hasGlobalAccess: true,
      allowedProgramIds: [],
    });
    assert.equal(service.canCreateCharityProgram(programManager), false);
    assert.equal(service.canCreateCharityProgram(superAdmin), true);
  });

  it('limits sensitive route policies to admins and subadmins', () => {
    const sensitivePolicies = [
      AuthorizationRoutePolicy.ViewAdministrators,
      AuthorizationRoutePolicy.AccessPrograms,
      AuthorizationRoutePolicy.ManageBenefits,
      AuthorizationRoutePolicy.ManageBeneficiaries,
      AuthorizationRoutePolicy.ManageDeliveries,
    ];

    for (const policy of sensitivePolicies) {
      assert.equal(service.canAccessRoutePolicy(superAdmin, policy), true);
      assert.equal(service.canAccessRoutePolicy(programManager, policy), true);
      assert.equal(service.canAccessRoutePolicy(caseWorker, policy), false);
      assert.equal(service.canAccessRoutePolicy(beneficiary, policy), false);
    }

    assert.equal(service.canManageBenefit(superAdmin), true);
    assert.equal(service.canManageBenefit(programManager), true);
    assert.equal(service.canManageBenefit(caseWorker), false);
  });

  it('allows managers to edit beneficiaries only inside their program scope', () => {
    assert.equal(service.canEditBeneficiary(programManager, ['program-c']), false);
    assert.equal(service.canEditBeneficiary(programManager, []), false);
    assert.equal(service.canEditBeneficiary(programManager, ['program-b']), true);
    assert.equal(service.canEditBeneficiary(beneficiary, ['program-b']), false);
  });

  it('requires every assigned beneficiary program to be inside the manager scope', () => {
    assert.equal(
      service.canAssignBeneficiaryPrograms(programManager, ['program-a', 'program-b']),
      true,
    );
    assert.equal(
      service.canAssignBeneficiaryPrograms(programManager, ['program-a', 'program-c']),
      false,
    );
    assert.equal(service.canAssignBeneficiaryPrograms(programManager, []), false);
    assert.equal(service.canAssignBeneficiaryPrograms(superAdmin, ['program-c']), true);
    assert.equal(service.canAssignBeneficiaryPrograms(beneficiary, ['program-a']), false);
  });

  it('throws a distinct denial when a manager assigns an out-of-scope program', () => {
    logger.warn.mock.resetCalls();

    let error: unknown;
    try {
      service.assertCanAssignBeneficiaryPrograms(
        programManager,
        ['program-a', 'program-c'],
        { action: 'beneficiary.reassign_program' },
      );
    } catch (caught) {
      error = caught;
    }

    if (!(error instanceof ForbiddenException)) {
      throw error;
    }
    assert.deepEqual(error.getResponse(), {
      code: 'BENEFICIARY_PROGRAM_ASSIGNMENT_FORBIDDEN',
      message: 'Authenticated account cannot assign one or more of these charity programs.',
    });
    assert.equal(logger.warn.mock.calls[0]?.arguments[1]?.policy, 'canAssignBeneficiaryPrograms');
  });

  it('throws and logs when a route policy is denied', () => {
    logger.warn.mock.resetCalls();

    assert.throws(
      () => service.assertRoutePolicy(beneficiary, AuthorizationRoutePolicy.ManageAdministrators),
      ForbiddenException,
    );
    assert.equal(logger.warn.mock.callCount(), 1);
    assert.equal(logger.warn.mock.calls[0]?.arguments[0], 'authorization.denied');
  });
});
