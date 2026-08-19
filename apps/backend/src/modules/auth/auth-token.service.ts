import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AccountType } from '@solidarity-network/shared';
import type { AuthenticatedUser } from './auth.types';

interface TokenPayloadBase {
  sub: string;
  username: string;
  name: string;
  email: string;
  role: string | null;
  accountType: AccountType;
  programIds: string[];
  mustChangePassword: boolean;
  sessionVersion: number;
  csrfToken: string;
}

@Injectable()
export class AuthTokenService {
  constructor(
    @Inject(JwtService)
    private readonly jwtService: JwtService,
  ) {}

  sign(payload: TokenPayloadBase) {
    const claims = { ...payload } as TokenPayloadBase &
      Partial<Pick<AuthenticatedUser, 'iat' | 'exp'>>;
    delete claims.iat;
    delete claims.exp;

    return this.jwtService.sign(claims);
  }

  verify(token: string): AuthenticatedUser | null {
    try {
      return this.jwtService.verify<AuthenticatedUser>(token);
    } catch {
      return null;
    }
  }
}
