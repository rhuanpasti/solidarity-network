import { Module } from '@nestjs/common';
import { BenefitsController } from './benefits.controller';
import { BenefitsRepository } from './benefits.repository';
import { BenefitsService } from './benefits.service';
import { DemoModule } from '../demo/demo.module';

@Module({
  imports: [DemoModule],
  controllers: [BenefitsController],
  providers: [BenefitsService, BenefitsRepository],
  exports: [BenefitsService, BenefitsRepository],
})
export class BenefitsModule {}
