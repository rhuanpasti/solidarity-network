import { defineConfig, devices } from '@playwright/test';
import { e2eEnvironment } from './src/environment';

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,
  expect: {
    timeout: 7_000,
  },
  reporter: process.env.CI ? [['line']] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: e2eEnvironment.frontendBaseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'en-US',
  },
  projects: [
    {
      name: e2eEnvironment.target,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
