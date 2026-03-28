import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';

@Module({
  controllers: [AuthController],
  providers: [AuthRepository, AuthService, AuthTokenService],
  exports: [AuthService, AuthTokenService],
})
export class AuthModule {}
