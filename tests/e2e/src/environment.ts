import { loadEnvFile } from 'node:process';
import { resolve } from 'node:path';

const envFile = resolve(__dirname, '..', '.env');

try {
  loadEnvFile(envFile);
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
    throw error;
  }
}

export type E2ETarget = 'local' | 'published';
export type E2ERole = 'admin' | 'programManager' | 'beneficiary';

const target = (process.env.E2E_TARGET ?? 'local').toLowerCase();

if (target !== 'local' && target !== 'published') {
  throw new Error('E2E_TARGET must be either "local" or "published".');
}

const selectedTarget = target as E2ETarget;
const targetPrefix = selectedTarget.toUpperCase();

function resolveTargetValue(name: string, fallback?: string) {
  return process.env[`E2E_${targetPrefix}_${name}`] ?? process.env[`E2E_${name}`] ?? fallback;
}

export const e2eEnvironment = {
  target: selectedTarget,
  frontendBaseUrl: resolveTargetValue(
    'BASE_URL',
    selectedTarget === 'local' ? 'http://localhost:4200' : undefined,
  )!,
  apiBaseUrl: resolveTargetValue(
    'API_BASE_URL',
    selectedTarget === 'local' ? 'http://localhost:3000/api/v1' : undefined,
  ),
};

export function requireApiBaseUrl() {
  if (!e2eEnvironment.apiBaseUrl) {
    throw new Error(
      `Set E2E_${targetPrefix}_API_BASE_URL or E2E_API_BASE_URL in tests/e2e/.env for the ${selectedTarget} target.`,
    );
  }

  return e2eEnvironment.apiBaseUrl.replace(/\/$/, '');
}

export function requireCredentials(role: E2ERole) {
  const roleName = role.toUpperCase();
  const identifier = resolveTargetValue(`${roleName}_IDENTIFIER`);
  const password = resolveTargetValue(`${roleName}_PASSWORD`);

  if (!identifier || !password) {
    throw new Error(
      `Set E2E_${targetPrefix}_${roleName}_IDENTIFIER and E2E_${targetPrefix}_${roleName}_PASSWORD in tests/e2e/.env (or the unscoped E2E_${roleName}_* fallback).`,
    );
  }

  return { identifier, password };
}
