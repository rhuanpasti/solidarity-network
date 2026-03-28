import { Module } from '@nestjs/common';
import { AdministratorsModule } from '../administrators/administrators.module';
import { BeneficiariesModule } from '../beneficiaries/beneficiaries.module';
import { BenefitsModule } from '../benefits/benefits.module';
import { CharityProgramsModule } from '../charity-programs/charity-programs.module';
import { BenefitDeliveriesController } from './benefit-deliveries.controller';
import { BenefitDeliveriesRepository } from './benefit-deliveries.repository';
import { BenefitDeliveriesService } from './benefit-deliveries.service';

@Module({
  imports: [
    AdministratorsModule,
    BeneficiariesModule,
    BenefitsModule,
    CharityProgramsModule,
  ],
  controllers: [BenefitDeliveriesController],
  providers: [BenefitDeliveriesService, BenefitDeliveriesRepository],
})
export class BenefitDeliveriesModule {}
