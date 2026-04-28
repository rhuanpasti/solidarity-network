import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AccountType } from '@solidarity-network/shared';
import type { AppEnvironment } from '../../config/env.schema';

const RESET_TOKEN_TTL_SECONDS = 60 * 60;

@Injectable()
export class PasswordResetTokenService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<AppEnvironment>,
  ) {}

  createToken(payload: { accountId: string; accountType: AccountType; email: string }) {
    const expiresAt = Math.floor(Date.now() / 1000) + RESET_TOKEN_TTL_SECONDS;
    const body = this.encode({
      sub: payload.accountId,
      accountType: payload.accountType,
      email: payload.email,
      exp: expiresAt,
    });
    const signature = this.sign(body);

    return `${body}.${signature}`;
  }

  verifyToken(token: string):
    | { accountId: string; accountType: AccountType; email: string }
    | null {
    const [body, signature] = token.split('.');

    if (!body || !signature || !this.signatureMatches(body, signature)) {
      return null;
    }

    const payload = this.decode(body);

    if (
      !payload ||
      typeof payload.sub !== 'string' ||
      (payload.accountType !== 'administrator' &&
        payload.accountType !== 'beneficiary') ||
      typeof payload.email !== 'string' ||
      typeof payload.exp !== 'number' ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return {
      accountId: payload.sub,
      accountType: payload.accountType,
      email: payload.email,
    };
  }

  buildResetLink(token: string) {
    const publicUrl = this.configService.get('APP_PUBLIC_URL', { infer: true });
    const resetPath = this.configService.get('PASSWORD_RESET_PATH', { infer: true });
    const url = new URL(
      resetPath ?? '/reset-password',
      publicUrl ?? 'http://localhost:4200',
    );
    url.searchParams.set('token', token);

    return url.toString();
  }

  getExpiresInLabel() {
    return '1 hour';
  }

  private encode(payload: Record<string, unknown>) {
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  }

  private decode(value: string): Record<string, unknown> | null {
    try {
      return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Record<
        string,
        unknown
      >;
    } catch {
      return null;
    }
  }

  private sign(value: string) {
    const secret = this.configService.get('JWT_SECRET', { infer: true });
    return createHmac('sha256', String(secret)).update(value).digest('base64url');
  }

  private signatureMatches(body: string, signature: string) {
    const expectedSignature = this.sign(body);
    const actual = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);

    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}
