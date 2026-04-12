import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthTokenService } from './auth-token.service';
import { AuthRepository } from './auth.repository';
import { hashPassword, verifyPassword } from './password.util';
import type { AuthResponse, AuthenticatedUser } from './auth.types';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AuthRepository)
    private readonly repository: AuthRepository,
    @Inject(AuthTokenService)
    private readonly authTokenService: AuthTokenService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponse> {
    const credential = await this.repository.findCredentialByIdentifier(
      dto.identifier.trim(),
    );

    if (!credential) {
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
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid login or password.',
      });
    }

    return this.toAuthResponse({
      sub: credential.id,
      username: credential.username,
      name: credential.name,
      email: credential.email,
      role: credential.role,
      accountType: credential.accountType,
      mustChangePassword: credential.mustChangePassword,
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

    return this.toAuthResponse({
      sub: updatedCredential.id,
      username: updatedCredential.username,
      name: updatedCredential.name,
      email: updatedCredential.email,
      role: updatedCredential.role,
      accountType: updatedCredential.accountType,
      mustChangePassword: updatedCredential.mustChangePassword,
      iat: 0,
      exp: 0,
    });
  }

  private toAuthResponse(user: AuthenticatedUser): AuthResponse {
    return {
      token: this.authTokenService.sign(user),
      user: {
        id: user.sub,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        accountType: user.accountType,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }
}
