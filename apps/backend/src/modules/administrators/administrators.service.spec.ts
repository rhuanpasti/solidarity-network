import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AdministratorsService } from './administrators.service';

const actor: AuthenticatedUser = {
  sub: 'admin-actor',
  username: 'super-admin',
  name: 'Super Admin',
  email: 'admin@example.org',
  role: 'super_admin',
  accountType: 'administrator',
  programIds: [],
  mustChangePassword: false,
  sessionVersion: 0,
  csrfToken: 'csrf-token',
  iat: 0,
  exp: 0,
};

function makeService() {
  const administrator = {
    id: 'admin-target',
    name: 'Target Admin',
    email: 'target@example.org',
    isSystemRoot: false,
  };
  const auditTrailService = { record: mock.fn(async () => undefined) };
  const authorizationService = {
    assertCanManageAdministrator: mock.fn(),
    getProgramScope: mock.fn(() => ({ hasGlobalAccess: true, allowedProgramIds: [] })),
  };
  const repository = {
    findById: mock.fn(async () => administrator),
    updateCredential: mock.fn(async () => undefined),
  };
  const charityProgramsRepository = { findById: mock.fn() };
  const emailService = { send: mock.fn(async () => undefined) };

  return {
    service: new AdministratorsService(
      auditTrailService as never,
      authorizationService as never,
      repository as never,
      charityProgramsRepository as never,
      emailService as never,
    ),
    auditTrailService,
    authorizationService,
    repository,
    emailService,
  };
}

describe('AdministratorsService', () => {
  it('regenerates and emails a temporary password without returning it', async () => {
    const { service, auditTrailService, authorizationService, repository, emailService } =
      makeService();

    const result = await service.resendTemporaryPassword('admin-target', actor);

    assert.deepEqual(result, { success: true });
    assert.equal(authorizationService.assertCanManageAdministrator.mock.callCount(), 1);
    assert.deepEqual(
      authorizationService.assertCanManageAdministrator.mock.calls[0]?.arguments,
      [
        actor,
        {
          action: 'administrator.temporary_password.resend',
          targetAdministratorId: 'admin-target',
        },
      ],
    );
    assert.equal(repository.updateCredential.mock.callCount(), 1);

    const credentialUpdate = repository.updateCredential.mock.calls[0]?.arguments[1] as {
      passwordHash: string;
      mustChangePassword: boolean;
      lastPasswordChangedAt: null;
    };
    assert.equal(credentialUpdate.mustChangePassword, true);
    assert.equal(credentialUpdate.lastPasswordChangedAt, null);
    assert.notEqual(credentialUpdate.passwordHash, undefined);
    assert.match(credentialUpdate.passwordHash, /^[0-9a-f]{32}:[0-9a-f]{128}$/);

    assert.equal(emailService.send.mock.callCount(), 1);
    const email = emailService.send.mock.calls[0]?.arguments[0] as {
      template: string;
      variables: { temporaryPassword: string };
    };
    assert.equal(email.template, 'temporary-password');
    assert.match(email.variables.temporaryPassword, /^\d{16}$/);
    assert.equal(auditTrailService.record.mock.callCount(), 1);
    assert.equal(
      auditTrailService.record.mock.calls[0]?.arguments[0].action,
      'administrator.temporary_password.resent',
    );
  });
});
