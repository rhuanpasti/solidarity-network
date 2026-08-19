import { test, expect } from '@playwright/test';
import { loginAs } from '../src/fixtures';

test('logs in, exposes an HTTP-only cookie, and logs out', async ({ page, context }) => {
  await loginAs(page);

  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);
  await expect(page.getByTestId('app-content')).toBeVisible();

  const sessionCookie = (await context.cookies()).find(
    (cookie) => cookie.name === 'solidarity_network_session',
  );
  expect(sessionCookie?.httpOnly).toBe(true);

  await page.getByTestId('logout-button').click();
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await expect(
    (await context.cookies()).find((cookie) => cookie.name === 'solidarity_network_session'),
  ).toBeUndefined();
});
