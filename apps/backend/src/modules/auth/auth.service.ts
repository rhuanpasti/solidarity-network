import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUserSummary } from '@solidarity-network/shared';
import { randomBytes } from 'node:crypto';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthTokenService } from './auth-token.service';
import { AuthRepository } from './auth.repository';
import { hashPassword, verifyPassword } from './password.util';
import type { AuthResponse, AuthenticatedUser } from './auth.types';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
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

    if (retryAfterSeconds > 0) {
      this.logAudit('auth.login.rate_limited', {
        identifier: normalizedIdentifier.toLowerCase(),
        retryAfterSeconds,
        ip: request.ip,
      });
      throw new HttpException({
        code: 'TOO_MANY_LOGIN_ATTEMPTS',
        message: 'Too many login attempts. Please try again later.',
        details: {
          retryAfterSeconds,
        },
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    const credential = await this.repository.findCredentialByIdentifier(
      normalizedIdentifier,
    );

    if (!credential) {
      this.authRateLimitService.registerFailure(rateLimitKeys);
      this.logAudit('auth.login.failed', {
        identifier: normalizedIdentifier.toLowerCase(),
        reason: 'credential_not_found_or_inactive',
        ip: request.ip,
      });
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid login or password.',
      });
    }

    const passwordMatches = await verifyPassword(
      dto.password,
      credential.passwordHash,
    );

    if (!passwordMatches) {
      this.authRateLimitService.registerFailure(rateLimitKeys);
      this.logAudit('auth.login.failed', {
        accountId: credential.id,
        accountType: credential.accountType,
        identifier: normalizedIdentifier.toLowerCase(),
        reason: 'password_mismatch',
        ip: request.ip,
      });
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid login or password.',
      });
    }

    this.authRateLimitService.registerSuccess(rateLimitKeys);
    this.logAudit('auth.login.succeeded', {
      accountId: credential.id,
      accountType: credential.accountType,
      ip: request.ip,
    });

    return this.toAuthResponse({
      sub: credential.id,
      username: credential.username,
      name: credential.name,
      email: credential.email,
      role: credential.role,
      accountType: credential.accountType,
      mustChangePassword: credential.mustChangePassword,
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

    this.logAudit('auth.password.changed', {
      accountId: updatedCredential.id,
      accountType: updatedCredential.accountType,
    });

    return this.toAuthResponse({
      sub: updatedCredential.id,
      username: updatedCredential.username,
      name: updatedCredential.name,
      email: updatedCredential.email,
      role: updatedCredential.role,
      accountType: updatedCredential.accountType,
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

  private logAudit(action: string, details: Record<string, unknown>) {
    this.logger.log(
      JSON.stringify({
        type: 'audit',
        action,
        timestamp: new Date().toISOString(),
        ...details,
      }),
    );
  }

  private createCsrfToken() {
    return randomBytes(32).toString('hex');
  }
}
