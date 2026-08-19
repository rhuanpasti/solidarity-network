import { expect, type Page } from '@playwright/test';
import { requireCredentials, type E2ERole } from './environment';

export async function loginAs(page: Page, role: E2ERole = 'admin') {
  const credentials = requireCredentials(role);

  await page.goto('/login');
  await page.getByTestId('login-form').getByLabel('Login').fill(credentials.identifier);
  await page.getByTestId('login-form').locator('input[type="password"]').fill(credentials.password);
  await page.getByTestId('login-submit').getByRole('button').click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
}
