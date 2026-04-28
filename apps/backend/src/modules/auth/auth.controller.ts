import { Body, Controller, Get, Inject, Post, Req, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuditTrailService } from '../observability/audit-trail.service';
import {
  AllowPasswordChangeWhenRequired,
  Public,
} from './auth.decorators';
import { attachAuthCookie, clearAuthCookie } from './auth-cookie.util';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './auth.guard';
import {
  AuthResponseDto,
  LogoutResponseDto,
  SessionResponseDto,
} from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuditTrailService)
    private readonly auditTrailService: AuditTrailService,
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Authenticate and create a session' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: AuthResponseDto })
  async login(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() dto: LoginDto,
  ) {
    const authResponse = await this.authService.login(dto, request);
    attachAuthCookie(response, request, authResponse.token);
    return authResponse;
  }

  @Get('session')
  @AllowPasswordChangeWhenRequired()
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get the authenticated session' })
  @ApiOkResponse({ type: SessionResponseDto })
  getSession(@Req() request: AuthenticatedRequest) {
    return this.authService.getSession(request.authUser);
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Clear the current session' })
  @ApiOkResponse({ type: LogoutResponseDto })
  logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    clearAuthCookie(response, request);
    void this.auditTrailService.record({
      action: 'auth.logout.requested',
      status: 'success',
    });
    return { success: true };
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({ schema: { properties: { success: { type: 'boolean' } } } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset a password with a recovery token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ schema: { properties: { success: { type: 'boolean' } } } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @AllowPasswordChangeWhenRequired()
  @Post('change-password')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Change the current account password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({ type: AuthResponseDto })
  async changePassword(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
    @Body() dto: ChangePasswordDto,
  ) {
    const authResponse = await this.authService.changePassword(
      request.authUser,
      dto,
    );
    attachAuthCookie(response, request, authResponse.token);
    return authResponse;
  }
}
