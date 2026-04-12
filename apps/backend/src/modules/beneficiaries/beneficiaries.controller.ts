import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BeneficiariesService } from './beneficiaries.service';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { LookupAddressDto } from './dto/lookup-address.dto';
import { QueryBeneficiariesDto } from './dto/query-beneficiaries.dto';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto';
import { PostalCodeLookupService } from './postal-code-lookup.service';

@ApiTags('Beneficiaries')
@Controller('beneficiaries')
export class BeneficiariesController {
  constructor(
    @Inject(BeneficiariesService)
    private readonly beneficiariesService: BeneficiariesService,
    @Inject(PostalCodeLookupService)
    private readonly postalCodeLookupService: PostalCodeLookupService,
  ) {}

  @Post()
  create(@Body() dto: CreateBeneficiaryDto) {
    return this.beneficiariesService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryBeneficiariesDto) {
    return this.beneficiariesService.findAll(query);
  }

  @Get('address-lookup')
  lookupAddress(@Query() query: LookupAddressDto) {
    return this.postalCodeLookupService.lookupBrazilianAddress(query.postalCode);
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
