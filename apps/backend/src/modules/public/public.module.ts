import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PublicController } from './public.controller';
import { DemoModule } from '../demo/demo.module';
import { PublicService } from './public.service';

@Module({
  imports: [AuthModule, DemoModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
