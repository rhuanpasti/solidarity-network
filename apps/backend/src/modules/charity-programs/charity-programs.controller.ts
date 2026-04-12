import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CharityProgramsService } from './charity-programs.service';
import { CreateCharityProgramDto } from './dto/create-charity-program.dto';
import { UpdateCharityProgramDto } from './dto/update-charity-program.dto';
import { UpdateCharityProgramStatusDto } from './dto/update-charity-program-status.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AccountTypes } from '../auth/auth.decorators';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { AuthorizeRoute } from '../authorization/authorization.decorators';
import { AuthorizationRoutePolicy } from '../authorization/authorization.types';

@ApiTags('Charity Programs')
@AccountTypes('administrator')
@AuthorizeRoute(AuthorizationRoutePolicy.AccessPrograms)
@Controller('charity-programs')
export class CharityProgramsController {
  constructor(
    @Inject(CharityProgramsService)
    private readonly charityProgramsService: CharityProgramsService,
  ) {}

  @Post()
  @AuthorizeRoute(AuthorizationRoutePolicy.CreateCharityProgram)
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateCharityProgramDto) {
    return this.charityProgramsService.create(dto, request.authUser);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest, @Query() query: PaginationQueryDto) {
    return this.charityProgramsService.findAll(query, request.authUser);
  }

  @Get(':id')
  findOne(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.charityProgramsService.findOne(id, request.authUser);
  }

  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCharityProgramDto,
  ) {
    return this.charityProgramsService.update(id, dto, request.authUser);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCharityProgramStatusDto,
  ) {
    return this.charityProgramsService.updateStatus(id, dto, request.authUser);
  }
}
