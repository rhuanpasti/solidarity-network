import { Inject, Injectable, Optional } from '@nestjs/common';
import type { Request } from 'express';

export interface AuthRateLimitState {
  attempts: number;
  windowStartedAt: number;
  blockedUntil: number | null;
}

export interface AuthRateLimitStore {
  get(key: string): AuthRateLimitState | undefined;
  set(key: string, state: AuthRateLimitState): void;
  delete(key: string): void;
  entries(): IterableIterator<[string, AuthRateLimitState]>;
}

export const AUTH_RATE_LIMIT_STORE = Symbol('AUTH_RATE_LIMIT_STORE');

@Injectable()
export class InMemoryAuthRateLimitStore implements AuthRateLimitStore {
  private readonly values = new Map<string, AuthRateLimitState>();

  get(key: string) {
    return this.values.get(key);
  }

  set(key: string, state: AuthRateLimitState) {
    this.values.set(key, state);
  }

  delete(key: string) {
    this.values.delete(key);
  }

  entries() {
    return this.values.entries();
  }
}

export type AuthRateLimitAction =
  | 'login'
  | 'forgot-password'
  | 'reset-password'
  | 'public-metrics';

const WINDOW_MS = 1000 * 60 * 15;
const MAX_ATTEMPTS = 5;
const PUBLIC_METRICS_MAX_REQUESTS = 20;
const BLOCK_DURATION_MS = 1000 * 60 * 15;
const PASSWORD_RECOVERY_MAX_ATTEMPTS = 3;
const PASSWORD_RECOVERY_BLOCK_DURATION_MS = 1000 * 60 * 60;

@Injectable()
export class AuthRateLimitService {
  private readonly store: AuthRateLimitStore;

  constructor(
    @Optional() @Inject(AUTH_RATE_LIMIT_STORE) store?: AuthRateLimitStore,
  ) {
    this.store = store ?? new InMemoryAuthRateLimitStore();
  }

  buildKeys(
    request: Request,
    identifier: string,
    action: AuthRateLimitAction = 'login',
  ) {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const clientIp = request.ip || 'unknown';

    return [
      `auth:${action}:ip:${clientIp}`,
      `auth:${action}:ip-identifier:${clientIp}:${normalizedIdentifier}`,
    ];
  }

  getRetryAfterSeconds(keys: string[]) {
    const now = Date.now();
    this.pruneExpired(now);
    let retryAfterSeconds = 0;

    for (const key of keys) {
      const state = this.getState(key, now);

      if (!state?.blockedUntil || state.blockedUntil <= now) {
        continue;
      }

      retryAfterSeconds = Math.max(
        retryAfterSeconds,
        Math.ceil((state.blockedUntil - now) / 1000),
      );
    }

    return retryAfterSeconds;
  }

  registerFailure(keys: string[]) {
    this.register(keys, MAX_ATTEMPTS);
  }

  registerPasswordRecoveryAttempt(keys: string[]) {
    this.register(
      keys,
      PASSWORD_RECOVERY_MAX_ATTEMPTS,
      PASSWORD_RECOVERY_BLOCK_DURATION_MS,
    );
  }

  registerRequest(keys: string[], maxRequests = PUBLIC_METRICS_MAX_REQUESTS) {
    this.register(keys, maxRequests);
  }

  private register(
    keys: string[],
    maxAttempts: number,
    blockDurationMs = BLOCK_DURATION_MS,
  ) {
    const now = Date.now();
    this.pruneExpired(now);

    for (const key of keys) {
      const state = this.getState(key, now) ?? {
        attempts: 0,
        windowStartedAt: now,
        blockedUntil: null,
      };

      state.attempts += 1;

      if (state.attempts >= maxAttempts) {
        state.blockedUntil = now + blockDurationMs;
      }

      this.store.set(key, state);
    }
  }

  registerSuccess(keys: string[]) {
    keys.forEach((key) => this.store.delete(key));
  }

  private getState(key: string, now: number) {
    const current = this.store.get(key);

    if (!current) {
      return null;
    }

    if (current.blockedUntil && current.blockedUntil > now) {
      return current;
    }

    if (current.windowStartedAt + WINDOW_MS <= now) {
      this.store.delete(key);
      return null;
    }

    if (current.blockedUntil && current.blockedUntil <= now) {
      this.store.delete(key);
      return null;
    }

    return current;
  }

  private pruneExpired(now: number) {
    for (const [key, state] of this.store.entries()) {
      if (
        state.windowStartedAt + WINDOW_MS <= now &&
        (!state.blockedUntil || state.blockedUntil <= now)
      ) {
        this.store.delete(key);
      }
    }
  }
}
