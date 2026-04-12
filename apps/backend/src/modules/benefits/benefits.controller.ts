import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AccountTypes } from '../auth/auth.decorators';
import { BenefitsService } from './benefits.service';
import { CreateBenefitDto } from './dto/create-benefit.dto';
import { UpdateBenefitDto } from './dto/update-benefit.dto';
import { UpdateBenefitStatusDto } from './dto/update-benefit-status.dto';

@ApiTags('Benefits')
@AccountTypes('administrator')
@Controller('benefits')
export class BenefitsController {
  constructor(
    @Inject(BenefitsService)
    private readonly benefitsService: BenefitsService,
  ) {}

  @Post()
  create(@Body() dto: CreateBenefitDto) {
    return this.benefitsService.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.benefitsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.benefitsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBenefitDto) {
    return this.benefitsService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateBenefitStatusDto) {
    return this.benefitsService.updateStatus(id, dto);
  }
}
