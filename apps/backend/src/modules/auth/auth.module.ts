import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { EmailModule } from '../email/email.module';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';
import { PasswordResetTokenService } from './password-reset-token.service';

@Module({
  imports: [
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '8h' },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthRateLimitService,
    AuthRepository,
    AuthService,
    AuthTokenService,
    PasswordResetTokenService,
  ],
  exports: [AuthRepository, AuthService, AuthTokenService],
})
export class AuthModule {}
