import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthRateLimitService,
    AuthRepository,
    AuthService,
    AuthTokenService,
  ],
  exports: [AuthRepository, AuthService, AuthTokenService],
})
export class AuthModule {}
