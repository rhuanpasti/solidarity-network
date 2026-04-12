import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CharityProgramsService } from './charity-programs.service';
import { CreateCharityProgramDto } from './dto/create-charity-program.dto';
import { UpdateCharityProgramDto } from './dto/update-charity-program.dto';
import { UpdateCharityProgramStatusDto } from './dto/update-charity-program-status.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AccountTypes, AdministratorRoles } from '../auth/auth.decorators';

@ApiTags('Charity Programs')
@AccountTypes('administrator')
@Controller('charity-programs')
export class CharityProgramsController {
  constructor(
    @Inject(CharityProgramsService)
    private readonly charityProgramsService: CharityProgramsService,
  ) {}

  @Post()
  @AdministratorRoles('super_admin')
  create(@Body() dto: CreateCharityProgramDto) {
    return this.charityProgramsService.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.charityProgramsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.charityProgramsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCharityProgramDto) {
    return this.charityProgramsService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCharityProgramStatusDto,
  ) {
    return this.charityProgramsService.updateStatus(id, dto);
  }
}
