import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AccountTypes } from '../auth/auth.decorators';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { AuthorizeRoute } from '../authorization/authorization.decorators';
import { AuthorizationRoutePolicy } from '../authorization/authorization.types';
import { BenefitsService } from './benefits.service';
import { CreateBenefitDto } from './dto/create-benefit.dto';
import { UpdateBenefitDto } from './dto/update-benefit.dto';
import { UpdateBenefitStatusDto } from './dto/update-benefit-status.dto';

@ApiTags('Benefits')
@AccountTypes('administrator')
@AuthorizeRoute(AuthorizationRoutePolicy.ManageBenefits)
@Controller('benefits')
export class BenefitsController {
  constructor(
    @Inject(BenefitsService)
    private readonly benefitsService: BenefitsService,
  ) {}

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateBenefitDto) {
    return this.benefitsService.create(dto, request.authUser);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest, @Query() query: PaginationQueryDto) {
    return this.benefitsService.findAll(query, request.authUser);
  }

  @Get(':id')
  findOne(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.benefitsService.findOne(id, request.authUser);
  }

  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateBenefitDto,
  ) {
    return this.benefitsService.update(id, dto, request.authUser);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateBenefitStatusDto,
  ) {
    return this.benefitsService.updateStatus(id, dto, request.authUser);
  }
}
