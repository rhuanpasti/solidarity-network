import { Body, Controller, Get, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  AllowPasswordChangeWhenRequired,
  Public,
} from './auth.decorators';
import { attachAuthCookie, clearAuthCookie } from './auth-cookie.util';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Post('login')
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
  getSession(@Req() request: AuthenticatedRequest) {
    return this.authService.getSession(request.authUser);
  }

  @Public()
  @Post('logout')
  logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    clearAuthCookie(response, request);
    return { success: true };
  }

  @AllowPasswordChangeWhenRequired()
  @Post('change-password')
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
