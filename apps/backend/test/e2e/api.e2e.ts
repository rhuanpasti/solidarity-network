import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const baseUrl = process.env.E2E_BASE_URL?.replace(/\/$/, '');
const password = process.env.E2E_PASSWORD;
const enabled = Boolean(baseUrl && password);

interface LoginResult {
  token: string;
  user: {
    accountType: string;
    role: string | null;
  };
}

async function request(path: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, init);
}

async function readJson(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

async function login(identifier: string): Promise<LoginResult> {
  assert.ok(password);
  const response = await request('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });

  assert.equal(response.ok, true);
  return (await readJson(response)) as unknown as LoginResult;
}

describe('backend API', () => {
  it('rejects unauthenticated access to protected resources', { skip: !enabled }, async () => {
    const response = await request('/beneficiaries');
    const body = await readJson(response);

    assert.equal(response.status, 401);
    assert.equal(body.code, 'AUTH_REQUIRED');
  });

  it('authenticates an administrator and propagates request correlation', { skip: !enabled }, async () => {
    const auth = await login('e2e-root');
    const requestId = 'e2e-request-correlation';
    const response = await request('/auth/session', {
      headers: {
        authorization: `Bearer ${auth.token}`,
        'x-request-id': requestId,
      },
    });
    const body = await readJson(response);
    const user = body.user as Record<string, unknown>;

    assert.equal(response.status, 200);
    assert.equal(user.accountType, 'administrator');
    assert.equal(user.role, 'super_admin');
    assert.equal(response.headers.get('x-request-id'), requestId);
  });

  it('enforces route RBAC for a case worker', { skip: !enabled }, async () => {
    const auth = await login('e2e-worker');
    const response = await request('/beneficiaries', {
      headers: { authorization: `Bearer ${auth.token}` },
    });
    const body = await readJson(response);

    assert.equal(response.status, 403);
    assert.equal(body.code, 'ROUTE_POLICY_FORBIDDEN');
  });

  it('keeps the beneficiary portal scoped to the authenticated beneficiary', { skip: !enabled }, async () => {
    const auth = await login('ana.souza@example.org');
    const response = await request('/beneficiary-portal/me', {
      headers: { authorization: `Bearer ${auth.token}` },
    });
    const body = await readJson(response);
    const beneficiary = body.beneficiary as Record<string, unknown>;
    const pastDeliveries = body.pastDeliveries as unknown[];

    assert.equal(response.status, 200);
    assert.equal(beneficiary.email, 'ana.souza@example.org');
    assert.ok(Array.isArray(pastDeliveries));
    assert.ok(pastDeliveries.length > 0);
    assert.equal(body.beneficiaries instanceof Array, true);
  });
});
