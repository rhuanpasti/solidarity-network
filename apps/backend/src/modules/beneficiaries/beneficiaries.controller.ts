import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccountTypes } from '../auth/auth.decorators';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { AuthorizeRoute } from '../authorization/authorization.decorators';
import { AuthorizationRoutePolicy } from '../authorization/authorization.types';
import { BeneficiariesService } from './beneficiaries.service';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { LookupAddressDto } from './dto/lookup-address.dto';
import { QueryBeneficiariesDto } from './dto/query-beneficiaries.dto';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto';
import { PostalCodeLookupService } from './postal-code-lookup.service';

@ApiTags('Beneficiaries')
@AccountTypes('administrator')
@AuthorizeRoute(AuthorizationRoutePolicy.ManageBeneficiaries)
@Controller('beneficiaries')
export class BeneficiariesController {
  constructor(
    @Inject(BeneficiariesService)
    private readonly beneficiariesService: BeneficiariesService,
    @Inject(PostalCodeLookupService)
    private readonly postalCodeLookupService: PostalCodeLookupService,
  ) {}

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateBeneficiaryDto) {
    return this.beneficiariesService.create(dto, request.authUser);
  }

  @Get()
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query() query: QueryBeneficiariesDto,
  ) {
    return this.beneficiariesService.findAll(query, request.authUser);
  }

  @Get('address-lookup')
  lookupAddress(@Query() query: LookupAddressDto) {
    return this.postalCodeLookupService.lookupBrazilianAddress(query.postalCode);
  }

  @Get(':id')
  findOne(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.beneficiariesService.findOne(id, request.authUser);
  }

  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateBeneficiaryDto,
  ) {
    return this.beneficiariesService.update(id, dto, request.authUser);
  }
}
