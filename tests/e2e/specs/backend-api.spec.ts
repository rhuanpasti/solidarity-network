import { test, expect } from '@playwright/test';
import { requireApiBaseUrl, requireCredentials } from '../src/environment';

test('accepts a configured admin login and issues an HTTP-only session cookie', async ({ request }) => {
  const response = await request.post(`${requireApiBaseUrl()}/auth/login`, {
    data: {
      ...requireCredentials('admin'),
    },
  });

  expect(response.ok()).toBeTruthy();
  const sessionCookie = response
    .headersArray()
    .find((header) => header.name.toLowerCase() === 'set-cookie');
  expect(sessionCookie?.value).toContain('solidarity_network_session=');
  expect(sessionCookie?.value.toLowerCase()).toContain('httponly');

  const body = await response.json();
  expect(body.user).toEqual(expect.objectContaining({ accountType: 'administrator' }));
});
