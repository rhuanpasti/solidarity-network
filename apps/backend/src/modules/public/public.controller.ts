import { Controller, Get, HttpException, HttpStatus, Inject, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthRateLimitService } from '../auth/auth-rate-limit.service';
import { Public } from '../auth/auth.decorators';
import { PublicService } from './public.service';

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(
    @Inject(PublicService)
    private readonly publicService: PublicService,
    @Inject(AuthRateLimitService)
    private readonly authRateLimitService: AuthRateLimitService,
  ) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Public()
  @Get('login-metrics')
  getLoginMetrics(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const keys = this.authRateLimitService.buildKeys(
      request,
      'public-login-metrics',
      'public-metrics',
    );
    const retryAfterSeconds = this.authRateLimitService.getRetryAfterSeconds(keys);

    if (retryAfterSeconds > 0) {
      response.setHeader('Retry-After', retryAfterSeconds);
      throw new HttpException(
        {
          code: 'TOO_MANY_PUBLIC_METRICS_REQUESTS',
          message: 'Too many metrics requests. Please try again later.',
          details: { retryAfterSeconds },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.authRateLimitService.registerRequest(keys);
    response.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return this.publicService.getLoginMetrics();
  }
}
