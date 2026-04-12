import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AccountType } from '@solidarity-network/shared';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AuthenticatedUser } from './auth.types';

interface TokenPayloadBase {
  sub: string;
  username: string;
  name: string;
  email: string;
  role: string | null;
  accountType: AccountType;
  mustChangePassword: boolean;
}

@Injectable()
export class AuthTokenService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {}

  sign(payload: TokenPayloadBase) {
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
      ...payload,
      iat: now,
      exp: now + 60 * 60 * 8,
    };

    const header = this.toBase64Url(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    );
    const body = this.toBase64Url(JSON.stringify(fullPayload));
    const signature = this.signValue(`${header}.${body}`);

    return `${header}.${body}.${signature}`;
  }

  verify(token: string): AuthenticatedUser | null {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return null;
    }

    const header = parts[0];
    const body = parts[1];
    const signature = parts[2];

    if (!header || !body || !signature) {
      return null;
    }

    const expectedSignature = this.signValue(`${header}.${body}`);

    if (!this.safeCompare(signature, expectedSignature)) {
      return null;
    }

    try {
      const payload = JSON.parse(
        Buffer.from(body, 'base64url').toString('utf8'),
      ) as AuthenticatedUser;

      if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  private signValue(value: string) {
    return createHmac('sha256', this.configService.getOrThrow<string>('JWT_SECRET'))
      .update(value)
      .digest('base64url');
  }

  private toBase64Url(value: string) {
    return Buffer.from(value).toString('base64url');
  }

  private safeCompare(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }
}
