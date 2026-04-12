import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { BeneficiaryPortalSummary } from '@solidarity-network/shared';
import { DomainNotFoundException } from '../../common/exceptions/domain-not-found.exception';
import { PrismaService } from '../../prisma/prisma.service';

type BeneficiaryPortalBeneficiary = Prisma.BeneficiaryGetPayload<{
  include: { charityProgram: true };
}>;

type UpcomingDelivery = Prisma.BenefitDeliveryGetPayload<{
  include: { benefit: true; charityProgram: true };
}>;

@Injectable()
export class BeneficiaryPortalService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async getOverview(beneficiaryId: string): Promise<BeneficiaryPortalSummary> {
    const [beneficiary, upcomingDeliveries] = await Promise.all([
      this.prisma.beneficiary.findUnique({
        where: { id: beneficiaryId },
        include: {
          charityProgram: true,
        },
      }),
      this.prisma.benefitDelivery.findMany({
        where: {
          beneficiaryId,
          deliveryDate: {
            gte: this.getStartOfToday(),
          },
        },
        include: {
          benefit: true,
          charityProgram: true,
        },
        orderBy: [{ deliveryDate: 'asc' }, { createdAt: 'asc' }],
        take: 20,
      }),
    ]);

    if (!beneficiary) {
      throw new DomainNotFoundException('beneficiary', beneficiaryId);
    }

    return {
      beneficiary: this.toPortalBeneficiary(beneficiary),
      upcomingDeliveries: upcomingDeliveries.map((delivery) =>
        this.toUpcomingDelivery(delivery),
      ),
    };
  }

  private toPortalBeneficiary(
    beneficiary: BeneficiaryPortalBeneficiary,
  ): BeneficiaryPortalSummary['beneficiary'] {
    return {
      id: beneficiary.id,
      fullName: beneficiary.fullName,
      document: beneficiary.document,
      birthDate: beneficiary.birthDate?.toISOString() ?? null,
      email: beneficiary.email,
      phone: beneficiary.phone,
      status: beneficiary.status,
      charityProgram: {
        id: beneficiary.charityProgram.id,
        name: beneficiary.charityProgram.name,
        description: beneficiary.charityProgram.description,
        status: beneficiary.charityProgram.status,
        createdAt: beneficiary.charityProgram.createdAt.toISOString(),
        updatedAt: beneficiary.charityProgram.updatedAt.toISOString(),
      },
    };
  }

  private toUpcomingDelivery(
    delivery: UpcomingDelivery,
  ): BeneficiaryPortalSummary['upcomingDeliveries'][number] {
    return {
      id: delivery.id,
      reference: delivery.reference,
      deliveryDate: delivery.deliveryDate.toISOString(),
      benefit: {
        id: delivery.benefit.id,
        name: delivery.benefit.name,
        category: delivery.benefit.category,
      },
      charityProgram: {
        id: delivery.charityProgram.id,
        name: delivery.charityProgram.name,
        status: delivery.charityProgram.status,
      },
    };
  }

  private getStartOfToday() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }
}
