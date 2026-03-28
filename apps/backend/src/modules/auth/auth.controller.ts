import { Body, Controller, Inject, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  AllowPasswordChangeWhenRequired,
  Public,
} from './auth.decorators';
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
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @AllowPasswordChangeWhenRequired()
  @Post('change-password')
  changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(request.authUser.sub, dto);
  }
}
