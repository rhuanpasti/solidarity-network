import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { ProgramAccessScope } from '../authorization/authorization.types';
import { QueryBenefitDeliveriesDto } from './dto/query-benefit-deliveries.dto';

const benefitDeliveryInclude = {
  beneficiary: true,
  benefit: true,
  charityProgram: true,
  administrator: true,
} satisfies Prisma.BenefitDeliveryInclude;

@Injectable()
export class BenefitDeliveriesRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  create(data: Prisma.BenefitDeliveryUncheckedCreateInput) {
    return this.prisma.benefitDelivery.create({
      data,
      include: benefitDeliveryInclude,
    });
  }

  findMany(
    query: QueryBenefitDeliveriesDto,
    skip: number,
    take: number,
    scope?: ProgramAccessScope,
  ) {
    return this.prisma.benefitDelivery.findMany({
      where: this.buildWhere(query, scope),
      include: benefitDeliveryInclude,
      orderBy: [{ deliveryDate: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
    });
  }

  count(query: QueryBenefitDeliveriesDto, scope?: ProgramAccessScope) {
    return this.prisma.benefitDelivery.count({
      where: this.buildWhere(query, scope),
    });
  }

  findById(id: string, scope?: ProgramAccessScope) {
    return this.prisma.benefitDelivery.findFirst({
      where: this.buildWhere({}, scope, { id }),
      include: benefitDeliveryInclude,
    });
  }

  private buildWhere(
    query: Partial<QueryBenefitDeliveriesDto>,
    scope?: ProgramAccessScope,
    extra?: Prisma.BenefitDeliveryWhereInput,
  ): Prisma.BenefitDeliveryWhereInput {
    const filters: Prisma.BenefitDeliveryWhereInput[] = [];

    if (extra) {
      filters.push(extra);
    }

    if (query.beneficiaryId) {
      filters.push({ beneficiaryId: query.beneficiaryId });
    }

    if (query.charityProgramId) {
      filters.push({ charityProgramId: query.charityProgramId });
    }

    if (scope && !scope.hasGlobalAccess) {
      filters.push({
        charityProgramId: {
          in: scope.allowedProgramIds,
        },
      });
    }

    if (!filters.length) {
      return {};
    }

    return filters.length === 1 ? filters[0]! : { AND: filters };
  }
}
