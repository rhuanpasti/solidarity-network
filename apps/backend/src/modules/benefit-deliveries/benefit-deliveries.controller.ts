import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BenefitDeliveriesService } from './benefit-deliveries.service';
import { CreateBenefitDeliveryDto } from './dto/create-benefit-delivery.dto';
import { QueryBenefitDeliveriesDto } from './dto/query-benefit-deliveries.dto';

@ApiTags('Benefit Deliveries')
@Controller('benefit-deliveries')
export class BenefitDeliveriesController {
  constructor(
    @Inject(BenefitDeliveriesService)
    private readonly benefitDeliveriesService: BenefitDeliveriesService,
  ) {}

  @Post()
  create(@Body() dto: CreateBenefitDeliveryDto) {
    return this.benefitDeliveriesService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryBenefitDeliveriesDto) {
    return this.benefitDeliveriesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.benefitDeliveriesService.findOne(id);
  }
}
