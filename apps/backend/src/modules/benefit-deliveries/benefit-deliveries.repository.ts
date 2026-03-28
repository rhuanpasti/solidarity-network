import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryBenefitDeliveriesDto } from './dto/query-benefit-deliveries.dto';

const benefitDeliveryInclude = {
  beneficiary: true,
  benefit: true,
  charityProgram: true,
  administrator: true,
} satisfies Prisma.BenefitDeliveryInclude;

@Injectable()
export class BenefitDeliveriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.BenefitDeliveryUncheckedCreateInput) {
    return this.prisma.benefitDelivery.create({
      data,
      include: benefitDeliveryInclude,
    });
  }

  findMany(query: QueryBenefitDeliveriesDto, skip: number, take: number) {
    return this.prisma.benefitDelivery.findMany({
      where: {
        beneficiaryId: query.beneficiaryId,
        charityProgramId: query.charityProgramId,
      },
      include: benefitDeliveryInclude,
      orderBy: [{ deliveryDate: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
    });
  }

  count(query: QueryBenefitDeliveriesDto) {
    return this.prisma.benefitDelivery.count({
      where: {
        beneficiaryId: query.beneficiaryId,
        charityProgramId: query.charityProgramId,
      },
    });
  }

  findById(id: string) {
    return this.prisma.benefitDelivery.findUnique({
      where: { id },
      include: benefitDeliveryInclude,
    });
  }
}

