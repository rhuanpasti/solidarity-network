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
import { StructuredLoggerService } from '../observability/structured-logger.service';
import { EmailService } from '../email/email.service';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthTokenService } from './auth-token.service';
import { PasswordResetTokenService } from './password-reset-token.service';
import { AuthRepository } from './auth.repository';
import { hashPassword, verifyPassword } from './password.util';
import type { AuthResponse, AuthenticatedUser } from './auth.types';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { DemoDataService } from '../demo/demo-data.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AuditTrailService)
    private readonly auditTrailService: AuditTrailService,
    @Inject(StructuredLoggerService)
    private readonly logger: StructuredLoggerService,
    @Inject(AuthRateLimitService)
    private readonly authRateLimitService: AuthRateLimitService,
    @Inject(AuthRepository)
    private readonly repository: AuthRepository,
    @Inject(AuthTokenService)
    private readonly authTokenService: AuthTokenService,
    @Inject(EmailService)
    private readonly emailService: EmailService,
    @Inject(PasswordResetTokenService)
    private readonly passwordResetTokenService: PasswordResetTokenService,
    @Inject(DemoDataService)
    private readonly demoDataService: DemoDataService,
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

    const demoUser = this.demoDataService.authenticate(
      normalizedIdentifier,
      dto.password,
    );

    if (demoUser) {
      this.authRateLimitService.registerSuccess(rateLimitKeys);
      const authenticatedDemoUser: AuthenticatedUser = {
        ...demoUser,
        csrfToken: this.createCsrfToken(),
        iat: 0,
        exp: 0,
      };
      await this.auditTrailService.record({
        action: 'auth.demo_login.succeeded',
        status: 'success',
        actor: authenticatedDemoUser,
        metadata: { identifierFingerprint },
      });
      this.logger.log('auth.demo_login.succeeded', {
        event: 'auth.demo_login.succeeded',
        accountType: 'administrator',
        role: 'super_admin',
      });
      return this.toAuthResponse(authenticatedDemoUser);
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
      sessionVersion: matchingCredential.sessionVersion,
      csrfToken: this.createCsrfToken(),
      iat: 0,
      exp: 0,
    });
  }

  async changePassword(
    user: AuthenticatedUser,
    dto: ChangePasswordDto,
  ): Promise<AuthResponse> {
    if (this.demoDataService.isDemoUser(user)) {
      return this.toAuthResponse({
        ...user,
        csrfToken: this.createCsrfToken(),
        iat: 0,
        exp: 0,
      });
    }

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
      sessionVersion: updatedCredential.sessionVersion,
      csrfToken: this.createCsrfToken(),
      iat: 0,
      exp: 0,
    });
  }

  async forgotPassword(dto: ForgotPasswordDto, request: Request) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const rateLimitKeys = this.authRateLimitService.buildKeys(
      request,
      this.buildIdentifierFingerprint(normalizedEmail),
      'forgot-password',
    );
    const retryAfterSeconds =
      this.authRateLimitService.getRetryAfterSeconds(rateLimitKeys);

    if (retryAfterSeconds > 0) {
      throw new HttpException(
        {
          code: 'TOO_MANY_PASSWORD_RECOVERY_ATTEMPTS',
          message: 'Too many password recovery requests. Please try again later.',
          details: { retryAfterSeconds },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (
      this.demoDataService.isEnabled() &&
      normalizedEmail === this.demoDataService.demoEmail()
    ) {
      return { success: true };
    }

    this.authRateLimitService.registerFailure(rateLimitKeys);
    const recipient =
      await this.repository.findPasswordRecoveryRecipient(normalizedEmail);

    if (!recipient) {
      await this.auditTrailService.record({
        action: 'auth.password_recovery.requested',
        status: 'success',
        metadata: {
          emailFingerprint: this.buildIdentifierFingerprint(normalizedEmail),
          recipientFound: false,
        },
      });
      return { success: true };
    }

    const resetToken = await this.passwordResetTokenService.createToken({
      accountId: recipient.id,
      accountType: recipient.accountType,
      email: recipient.email,
    });

    try {
      await this.emailService.send({
        to: {
          email: recipient.email,
          name: recipient.name,
        },
        template: 'forgot-password',
        variables: {
          userName: recipient.name,
          email: recipient.email,
          resetPasswordLink: this.passwordResetTokenService.buildResetLink(resetToken),
          expiresIn: this.passwordResetTokenService.getExpiresInLabel(),
        },
      });
    } catch {
      await this.auditTrailService.record({
        action: 'auth.password_recovery.email_failed',
        status: 'failure',
        metadata: {
          emailFingerprint: this.buildIdentifierFingerprint(normalizedEmail),
        },
      });
    }

    await this.auditTrailService.record({
      action: 'auth.password_recovery.requested',
      status: 'success',
      actor: {
        sub: recipient.id,
        role: recipient.role,
        accountType: recipient.accountType,
      },
      metadata: {
        emailFingerprint: this.buildIdentifierFingerprint(normalizedEmail),
        recipientFound: true,
      },
    });

    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto, request: Request) {
    const rateLimitKeys = this.authRateLimitService.buildKeys(
      request,
      createHash('sha256').update(dto.token).digest('hex').slice(0, 16),
      'reset-password',
    );
    const retryAfterSeconds =
      this.authRateLimitService.getRetryAfterSeconds(rateLimitKeys);

    if (retryAfterSeconds > 0) {
      throw new HttpException(
        {
          code: 'TOO_MANY_PASSWORD_RESET_ATTEMPTS',
          message: 'Too many password reset attempts. Please try again later.',
          details: { retryAfterSeconds },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const tokenPayload = await this.passwordResetTokenService.consumeToken(dto.token);

    if (!tokenPayload) {
      this.authRateLimitService.registerFailure(rateLimitKeys);
      throw new BadRequestException({
        code: 'PASSWORD_RESET_TOKEN_INVALID',
        message: 'Password reset link is invalid or expired.',
      });
    }

    this.authRateLimitService.registerSuccess(rateLimitKeys);

    const updatedCredential = await this.repository.updatePassword(
      tokenPayload.accountType,
      tokenPayload.accountId,
      await hashPassword(dto.newPassword),
    );

    await this.auditTrailService.record({
      action: 'auth.password_reset.completed',
      status: 'success',
      actor: {
        sub: updatedCredential.id,
        role: updatedCredential.role,
        accountType: updatedCredential.accountType,
      },
      metadata: {
        emailFingerprint: this.buildIdentifierFingerprint(tokenPayload.email),
      },
    });

    return { success: true };
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
      isDemo: user.isDemo ?? false,
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
