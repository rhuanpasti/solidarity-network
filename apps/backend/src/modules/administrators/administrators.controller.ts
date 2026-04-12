import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AccountTypes, AdministratorRoles } from '../auth/auth.decorators';
import { AdministratorsService } from './administrators.service';
import { CreateAdministratorDto } from './dto/create-administrator.dto';
import { UpdateAdministratorDto } from './dto/update-administrator.dto';

@ApiTags('Administrators')
@AccountTypes('administrator')
@Controller('administrators')
export class AdministratorsController {
  constructor(
    @Inject(AdministratorsService)
    private readonly administratorsService: AdministratorsService,
  ) {}

  @Post()
  @AdministratorRoles('super_admin')
  create(@Body() dto: CreateAdministratorDto) {
    return this.administratorsService.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.administratorsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.administratorsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAdministratorDto) {
    return this.administratorsService.update(id, dto);
  }
}
