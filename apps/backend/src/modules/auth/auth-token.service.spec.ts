import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenService } from './auth-token.service';
import type { AuthenticatedUser } from './auth.types';

const user: AuthenticatedUser = {
  sub: 'admin-1',
  username: 'admin',
  name: 'Admin',
  email: 'admin@example.org',
  role: 'super_admin',
  accountType: 'administrator',
  programIds: [],
  mustChangePassword: false,
  csrfToken: 'csrf-token',
  iat: 0,
  exp: 0,
};

const service = new AuthTokenService(
  new JwtService({
    secret: 'test-secret-that-is-longer-than-thirty-two-characters',
    signOptions: { expiresIn: '8h' },
  }),
);

describe('AuthTokenService', () => {
  it('signs and verifies a token through the maintained JWT implementation', () => {
    const token = service.sign(user);
    const verified = service.verify(token);

    assert.equal(verified?.sub, user.sub);
    assert.equal(verified?.csrfToken, user.csrfToken);
    assert.ok((verified?.exp ?? 0) > (verified?.iat ?? 0));
  });

  it('rejects tampered and malformed tokens', () => {
    const token = service.sign(user);

    assert.equal(service.verify(`${token}tampered`), null);
    assert.equal(service.verify('not-a-jwt'), null);
  });
});
