import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { BeneficiaryPortalSummary } from '@solidarity-network/shared';
import { DomainNotFoundException } from '../../common/exceptions/domain-not-found.exception';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../../prisma/prisma.service';

type BeneficiaryPortalBeneficiary = Prisma.BeneficiaryGetPayload<{
  include: {
    charityPrograms: {
      include: { charityProgram: true };
    };
  };
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

  async getOverview(user: AuthenticatedUser): Promise<BeneficiaryPortalSummary> {
    const beneficiaryId = user.sub;
    const [beneficiary, upcomingDeliveries] = await Promise.all([
      this.prisma.beneficiary.findUnique({
        where: { id: beneficiaryId },
        include: {
          charityPrograms: {
            include: {
              charityProgram: true,
            },
          },
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
      charityPrograms: beneficiary.charityPrograms.map((link) => ({
        id: link.charityProgram.id,
        name: link.charityProgram.name,
        description: link.charityProgram.description,
        status: link.charityProgram.status,
        createdAt: link.charityProgram.createdAt.toISOString(),
        updatedAt: link.charityProgram.updatedAt.toISOString(),
      })),
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
