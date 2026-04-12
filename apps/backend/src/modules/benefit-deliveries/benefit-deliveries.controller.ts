import { Body, Controller, Get, Inject, Param, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccountTypes } from '../auth/auth.decorators';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { AuthorizeRoute } from '../authorization/authorization.decorators';
import { AuthorizationRoutePolicy } from '../authorization/authorization.types';
import { BenefitDeliveriesService } from './benefit-deliveries.service';
import { CreateBenefitDeliveryDto } from './dto/create-benefit-delivery.dto';
import { QueryBenefitDeliveriesDto } from './dto/query-benefit-deliveries.dto';

@ApiTags('Benefit Deliveries')
@AccountTypes('administrator')
@AuthorizeRoute(AuthorizationRoutePolicy.ManageDeliveries)
@Controller('benefit-deliveries')
export class BenefitDeliveriesController {
  constructor(
    @Inject(BenefitDeliveriesService)
    private readonly benefitDeliveriesService: BenefitDeliveriesService,
  ) {}

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateBenefitDeliveryDto) {
    return this.benefitDeliveriesService.create(dto, request.authUser);
  }

  @Get()
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query() query: QueryBenefitDeliveriesDto,
  ) {
    return this.benefitDeliveriesService.findAll(query, request.authUser);
  }

  @Get(':id')
  findOne(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.benefitDeliveriesService.findOne(id, request.authUser);
  }
}
