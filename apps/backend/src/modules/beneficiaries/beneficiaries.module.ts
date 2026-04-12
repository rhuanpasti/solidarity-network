import { Module } from '@nestjs/common';
import { CharityProgramsModule } from '../charity-programs/charity-programs.module';
import { BeneficiariesController } from './beneficiaries.controller';
import { BeneficiariesRepository } from './beneficiaries.repository';
import { BeneficiariesService } from './beneficiaries.service';
import { PostalCodeLookupService } from './postal-code-lookup.service';

@Module({
  imports: [CharityProgramsModule],
  controllers: [BeneficiariesController],
  providers: [BeneficiariesService, BeneficiariesRepository, PostalCodeLookupService],
  exports: [BeneficiariesService, BeneficiariesRepository],
})
export class BeneficiariesModule {}
