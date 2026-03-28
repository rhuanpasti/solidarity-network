import { Module } from '@nestjs/common';
import { CharityProgramsModule } from '../charity-programs/charity-programs.module';
import { AdministratorsController } from './administrators.controller';
import { AdministratorsRepository } from './administrators.repository';
import { AdministratorsService } from './administrators.service';

@Module({
  imports: [CharityProgramsModule],
  controllers: [AdministratorsController],
  providers: [AdministratorsService, AdministratorsRepository],
  exports: [AdministratorsService, AdministratorsRepository],
})
export class AdministratorsModule {}
