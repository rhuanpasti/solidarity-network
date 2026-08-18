import {
  Controller,
  Body,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AccountTypes } from '../auth/auth.decorators';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { AuthorizeRoute } from '../authorization/authorization.decorators';
import { AuthorizationRoutePolicy } from '../authorization/authorization.types';
import { AdministratorsService } from './administrators.service';
import { CreateAdministratorDto } from './dto/create-administrator.dto';
import { UpdateAdministratorDto } from './dto/update-administrator.dto';

@ApiTags('Administrators')
@AccountTypes('administrator')
@AuthorizeRoute(AuthorizationRoutePolicy.ViewAdministrators)
@Controller('administrators')
export class AdministratorsController {
  constructor(
    @Inject(AdministratorsService)
    private readonly administratorsService: AdministratorsService,
  ) {}

  @Post()
  @AuthorizeRoute(AuthorizationRoutePolicy.ManageAdministrators)
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateAdministratorDto) {
    return this.administratorsService.create(dto, request.authUser);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest, @Query() query: PaginationQueryDto) {
    return this.administratorsService.findAll(query, request.authUser);
  }

  @Get(':id')
  findOne(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.administratorsService.findOne(id, request.authUser);
  }

  @Post(':id/resend-access')
  @AuthorizeRoute(AuthorizationRoutePolicy.ManageAdministrators)
  resendAccess(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.administratorsService.resendTemporaryPassword(id, request.authUser);
  }

  @Patch(':id')
  @AuthorizeRoute(AuthorizationRoutePolicy.ManageAdministrators)
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateAdministratorDto,
  ) {
    return this.administratorsService.update(id, dto, request.authUser);
  }
}
