import { Controller, Get, Inject, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { AccountTypes } from '../auth/auth.decorators';
import { AuthorizeRoute } from '../authorization/authorization.decorators';
import { AuthorizationRoutePolicy } from '../authorization/authorization.types';
import { BeneficiaryPortalService } from './beneficiary-portal.service';

@ApiTags('Beneficiary Portal')
@AccountTypes('beneficiary')
@AuthorizeRoute(AuthorizationRoutePolicy.AccessBeneficiaryPortal)
@Controller('beneficiary-portal')
export class BeneficiaryPortalController {
  constructor(
    @Inject(BeneficiaryPortalService)
    private readonly beneficiaryPortalService: BeneficiaryPortalService,
  ) {}

  @Get('me')
  findMine(@Req() request: AuthenticatedRequest) {
    return this.beneficiaryPortalService.getOverview(request.authUser);
  }
}
