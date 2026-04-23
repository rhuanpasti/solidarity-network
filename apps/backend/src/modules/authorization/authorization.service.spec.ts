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

  it('allows managers to edit beneficiaries only inside their program scope', () => {
    assert.equal(service.canEditBeneficiary(programManager, ['program-c']), false);
    assert.equal(service.canEditBeneficiary(programManager, []), false);
    assert.equal(service.canEditBeneficiary(programManager, ['program-b']), true);
    assert.equal(service.canEditBeneficiary(beneficiary, ['program-b']), false);
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
