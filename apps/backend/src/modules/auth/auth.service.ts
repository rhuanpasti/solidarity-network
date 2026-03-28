import {
  BadRequestException,
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
    private readonly repository: AuthRepository,
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
      sub: credential.administrator.id,
      username: credential.username,
      name: credential.administrator.name,
      email: credential.administrator.email,
      role: credential.administrator.role,
      mustChangePassword: credential.mustChangePassword,
      iat: 0,
      exp: 0,
    });
  }

  async changePassword(
    administratorId: string,
    dto: ChangePasswordDto,
  ): Promise<AuthResponse> {
    const credential =
      await this.repository.findCredentialByAdministratorId(administratorId);

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
      administratorId,
      await hashPassword(dto.newPassword),
    );

    return this.toAuthResponse({
      sub: updatedCredential.administrator.id,
      username: updatedCredential.username,
      name: updatedCredential.administrator.name,
      email: updatedCredential.administrator.email,
      role: updatedCredential.administrator.role,
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
        mustChangePassword: user.mustChangePassword,
      },
    };
  }
}
