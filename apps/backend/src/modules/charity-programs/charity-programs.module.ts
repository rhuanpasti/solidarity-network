import { Module } from '@nestjs/common';
import { CharityProgramsController } from './charity-programs.controller';
import { CharityProgramsService } from './charity-programs.service';
import { CharityProgramsRepository } from './charity-programs.repository';

@Module({
  controllers: [CharityProgramsController],
  providers: [CharityProgramsService, CharityProgramsRepository],
  exports: [CharityProgramsService, CharityProgramsRepository],
})
export class CharityProgramsModule {}
