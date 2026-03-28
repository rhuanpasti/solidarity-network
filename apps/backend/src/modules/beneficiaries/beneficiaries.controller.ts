import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BeneficiariesService } from './beneficiaries.service';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { QueryBeneficiariesDto } from './dto/query-beneficiaries.dto';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto';

@ApiTags('Beneficiaries')
@Controller('beneficiaries')
export class BeneficiariesController {
  constructor(
    @Inject(BeneficiariesService)
    private readonly beneficiariesService: BeneficiariesService,
  ) {}

  @Post()
  create(@Body() dto: CreateBeneficiaryDto) {
    return this.beneficiariesService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryBeneficiariesDto) {
    return this.beneficiariesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.beneficiariesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBeneficiaryDto) {
    return this.beneficiariesService.update(id, dto);
  }
}
