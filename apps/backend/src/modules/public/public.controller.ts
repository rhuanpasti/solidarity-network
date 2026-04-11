import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/auth.decorators';
import { PublicService } from './public.service';

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(
    @Inject(PublicService)
    private readonly publicService: PublicService,
  ) {}

  @Public()
  @Get('login-metrics')
  getLoginMetrics() {
    return this.publicService.getLoginMetrics();
  }
}
