import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUserSummary } from '@solidarity-network/shared';
import { createHash, randomBytes } from 'node:crypto';
import { AuditTrailService } from '../observability/audit-trail.service';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthTokenService } from './auth-token.service';
import { AuthRepository } from './auth.repository';
import { hashPassword, verifyPassword } from './password.util';
import type { AuthResponse, AuthenticatedUser } from './auth.types';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AuditTrailService)
    private readonly auditTrailService: AuditTrailService,
    @Inject(AuthRateLimitService)
    private readonly authRateLimitService: AuthRateLimitService,
    @Inject(AuthRepository)
    private readonly repository: AuthRepository,
    @Inject(AuthTokenService)
    private readonly authTokenService: AuthTokenService,
  ) {}

  async login(dto: LoginDto, request: Request): Promise<AuthResponse> {
    const normalizedIdentifier = dto.identifier.trim();
    const rateLimitKeys = this.authRateLimitService.buildKeys(
      request,
      normalizedIdentifier,
    );
    const retryAfterSeconds =
      this.authRateLimitService.getRetryAfterSeconds(rateLimitKeys);
    const identifierFingerprint = this.buildIdentifierFingerprint(
      normalizedIdentifier,
    );

    if (retryAfterSeconds > 0) {
      await this.auditTrailService.record({
        action: 'auth.login.rate_limited',
        status: 'failure',
        metadata: {
          identifierFingerprint,
          retryAfterSeconds,
        },
      });
      throw new HttpException(
        {
          code: 'TOO_MANY_LOGIN_ATTEMPTS',
          message: 'Too many login attempts. Please try again later.',
          details: {
            retryAfterSeconds,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const credentials = await this.repository.findCredentialsByIdentifier(
      normalizedIdentifier,
    );
    const matchingCredential = await this.findMatchingCredential(
      credentials,
      dto.password,
    );

    if (!matchingCredential) {
      this.authRateLimitService.registerFailure(rateLimitKeys);
      await this.auditTrailService.record({
        action: 'auth.login.failed',
        status: 'failure',
        metadata: {
          identifierFingerprint,
          reason: 'credential_not_found_or_inactive',
        },
      });
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid login or password.',
      });
    }

    this.authRateLimitService.registerSuccess(rateLimitKeys);
    await this.auditTrailService.record({
      action: 'auth.login.succeeded',
      status: 'success',
      actor: {
        sub: matchingCredential.id,
        accountType: matchingCredential.accountType,
        role: matchingCredential.role,
      },
      metadata: {
        identifierFingerprint,
      },
    });

    return this.toAuthResponse({
      sub: matchingCredential.id,
      username: matchingCredential.username,
      name: matchingCredential.name,
      email: matchingCredential.email,
      role: matchingCredential.role,
      accountType: matchingCredential.accountType,
      programIds: matchingCredential.programIds,
      mustChangePassword: matchingCredential.mustChangePassword,
      csrfToken: this.createCsrfToken(),
      iat: 0,
      exp: 0,
    });
  }

  async changePassword(
    user: AuthenticatedUser,
    dto: ChangePasswordDto,
  ): Promise<AuthResponse> {
    const credential = await this.repository.findCredentialByAccount(
      user.accountType,
      user.sub,
    );

    if (!credential) {
      throw new UnauthorizedException({
        code: 'AUTH_CREDENTIAL_NOT_FOUND',
        message: 'Authentication credential not found.',
      });
    }

    const passwordMatches = await verifyPassword(
      dto.currentPassword,
      credential.passwordHash,
    );

    if (!passwordMatches) {
      await this.auditTrailService.record({
        action: 'auth.password_change.failed',
        status: 'failure',
        actor: user,
        metadata: {
          reason: 'invalid_current_password',
        },
      });
      throw new UnauthorizedException({
        code: 'INVALID_CURRENT_PASSWORD',
        message: 'Current password is invalid.',
      });
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException({
        code: 'PASSWORD_REUSE_NOT_ALLOWED',
        message: 'New password must be different from the current password.',
      });
    }

    const updatedCredential = await this.repository.updatePassword(
      user.accountType,
      user.sub,
      await hashPassword(dto.newPassword),
    );

    await this.auditTrailService.record({
      action: 'auth.password.changed',
      status: 'success',
      actor: user,
      metadata: {
        accountId: updatedCredential.id,
        accountType: updatedCredential.accountType,
      },
    });

    return this.toAuthResponse({
      sub: updatedCredential.id,
      username: updatedCredential.username,
      name: updatedCredential.name,
      email: updatedCredential.email,
      role: updatedCredential.role,
      accountType: updatedCredential.accountType,
      programIds: updatedCredential.programIds,
      mustChangePassword: updatedCredential.mustChangePassword,
      csrfToken: this.createCsrfToken(),
      iat: 0,
      exp: 0,
    });
  }

  getSession(user: AuthenticatedUser) {
    return {
      user: this.toUserSummary(user),
      csrfToken: user.csrfToken,
    };
  }

  private toAuthResponse(user: AuthenticatedUser): AuthResponse {
    return {
      token: this.authTokenService.sign(user),
      csrfToken: user.csrfToken,
      user: this.toUserSummary(user),
    };
  }

  private toUserSummary(user: AuthenticatedUser): AuthUserSummary {
    return {
      id: user.sub,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      accountType: user.accountType,
      mustChangePassword: user.mustChangePassword,
    };
  }

  private buildIdentifierFingerprint(identifier: string) {
    return createHash('sha256')
      .update(identifier.trim().toLowerCase())
      .digest('hex')
      .slice(0, 16);
  }

  private createCsrfToken() {
    return randomBytes(32).toString('hex');
  }

  private async findMatchingCredential(
    credentials: Awaited<ReturnType<AuthRepository['findCredentialsByIdentifier']>>,
    password: string,
  ) {
    for (const credential of credentials) {
      const passwordMatches = await verifyPassword(password, credential.passwordHash);

      if (passwordMatches) {
        return credential;
      }
    }

    return null;
  }
}
