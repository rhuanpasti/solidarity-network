import { Module } from '@nestjs/common';
import { CharityProgramsModule } from '../charity-programs/charity-programs.module';
import { EmailModule } from '../email/email.module';
import { BeneficiaryPortalController } from './beneficiary-portal.controller';
import { BeneficiaryPortalService } from './beneficiary-portal.service';
import { BeneficiariesController } from './beneficiaries.controller';
import { BeneficiariesRepository } from './beneficiaries.repository';
import { BeneficiariesService } from './beneficiaries.service';
import { PostalCodeLookupService } from './postal-code-lookup.service';
import { DemoModule } from '../demo/demo.module';

@Module({
  imports: [CharityProgramsModule, EmailModule, DemoModule],
  controllers: [BeneficiariesController, BeneficiaryPortalController],
  providers: [
    BeneficiariesService,
    BeneficiariesRepository,
    BeneficiaryPortalService,
    PostalCodeLookupService,
  ],
  exports: [BeneficiariesService, BeneficiariesRepository],
})
export class BeneficiariesModule {}
