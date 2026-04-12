import { Injectable } from '@nestjs/common';
import type { Request } from 'express';

interface AttemptState {
  attempts: number;
  windowStartedAt: number;
  blockedUntil: number | null;
}

const WINDOW_MS = 1000 * 60 * 15;
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 1000 * 60 * 15;

@Injectable()
export class AuthRateLimitService {
  private readonly attempts = new Map<string, AttemptState>();

  buildKeys(request: Request, identifier: string) {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const clientIp = this.resolveClientIp(request);

    return [`ip:${clientIp}`, `ip-identifier:${clientIp}:${normalizedIdentifier}`];
  }

  getRetryAfterSeconds(keys: string[]) {
    const now = Date.now();
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
    const now = Date.now();

    for (const key of keys) {
      const state = this.getState(key, now) ?? {
        attempts: 0,
        windowStartedAt: now,
        blockedUntil: null,
      };

      state.attempts += 1;

      if (state.attempts >= MAX_ATTEMPTS) {
        state.blockedUntil = now + BLOCK_DURATION_MS;
      }

      this.attempts.set(key, state);
    }
  }

  registerSuccess(keys: string[]) {
    keys.forEach((key) => this.attempts.delete(key));
  }

  private getState(key: string, now: number) {
    const current = this.attempts.get(key);

    if (!current) {
      return null;
    }

    if (current.blockedUntil && current.blockedUntil > now) {
      return current;
    }

    if (current.windowStartedAt + WINDOW_MS <= now) {
      this.attempts.delete(key);
      return null;
    }

    if (current.blockedUntil && current.blockedUntil <= now) {
      this.attempts.delete(key);
      return null;
    }

    return current;
  }

  private resolveClientIp(request: Request) {
    const forwardedFor = request.headers['x-forwarded-for'];

    if (typeof forwardedFor === 'string' && forwardedFor.length) {
      return forwardedFor.split(',')[0]?.trim() || request.ip;
    }

    if (Array.isArray(forwardedFor) && forwardedFor.length) {
      return forwardedFor[0] ?? request.ip;
    }

    return request.ip;
  }
}

