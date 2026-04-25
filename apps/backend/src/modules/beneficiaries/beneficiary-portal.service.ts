import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { BeneficiaryPortalSummary } from '@solidarity-network/shared';
import { DomainNotFoundException } from '../../common/exceptions/domain-not-found.exception';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../../prisma/prisma.service';

type BeneficiaryPortalBeneficiary = Prisma.BeneficiaryGetPayload<{
  include: {
    dependents: true;
    charityPrograms: {
      include: { charityProgram: true };
    };
  };
}>;

type PortalDelivery = Prisma.BenefitDeliveryGetPayload<{
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
    const startOfToday = this.getStartOfToday();
    const [beneficiary, upcomingDeliveries, pastDeliveries] = await Promise.all([
      this.prisma.beneficiary.findUnique({
        where: { id: beneficiaryId },
        include: {
          dependents: {
            orderBy: [{ fullName: 'asc' }, { createdAt: 'asc' }],
          },
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
            gte: startOfToday,
          },
        },
        include: {
          benefit: true,
          charityProgram: true,
        },
        orderBy: [{ deliveryDate: 'asc' }, { createdAt: 'asc' }],
        take: 20,
      }),
      this.prisma.benefitDelivery.findMany({
        where: {
          beneficiaryId,
          deliveryDate: {
            lt: startOfToday,
          },
        },
        include: {
          benefit: true,
          charityProgram: true,
        },
        orderBy: [{ deliveryDate: 'desc' }, { createdAt: 'desc' }],
        take: 50,
      }),
    ]);

    if (!beneficiary) {
      throw new DomainNotFoundException('beneficiary', beneficiaryId);
    }

    return {
      beneficiary: this.toPortalBeneficiary(beneficiary),
      programs: this.toPortalPrograms(beneficiary),
      beneficiaries: this.toPortalBeneficiaries(beneficiary),
      upcomingDeliveries: upcomingDeliveries.map((delivery) => this.toPortalDelivery(delivery)),
      pastDeliveries: pastDeliveries.map((delivery) => this.toPortalDelivery(delivery)),
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
      dependents: beneficiary.dependents.map((dependent) => ({
        id: dependent.id,
        fullName: dependent.fullName,
        relationship: dependent.relationship,
        document: dependent.document,
        birthDate: dependent.birthDate.toISOString(),
      })),
    };
  }

  private toPortalPrograms(
    beneficiary: BeneficiaryPortalBeneficiary,
  ): BeneficiaryPortalSummary['programs'] {
    return beneficiary.charityPrograms.map((link) => ({
        id: link.charityProgram.id,
        name: link.charityProgram.name,
        description: link.charityProgram.description,
        status: link.charityProgram.status,
        createdAt: link.charityProgram.createdAt.toISOString(),
        updatedAt: link.charityProgram.updatedAt.toISOString(),
      }));
  }

  private toPortalBeneficiaries(
    beneficiary: BeneficiaryPortalBeneficiary,
  ): BeneficiaryPortalSummary['beneficiaries'] {
    return [
      {
        id: beneficiary.id,
        fullName: beneficiary.fullName,
        document: beneficiary.document,
        birthDate: beneficiary.birthDate?.toISOString() ?? null,
        relationship: 'primary',
      },
      ...beneficiary.dependents.map((dependent) => ({
        id: dependent.id,
        fullName: dependent.fullName,
        document: dependent.document,
        birthDate: dependent.birthDate.toISOString(),
        relationship: dependent.relationship,
      })),
    ];
  }

  private toPortalDelivery(
    delivery: PortalDelivery,
  ): BeneficiaryPortalSummary['upcomingDeliveries'][number] {
    return {
      id: delivery.id,
      reference: delivery.reference,
      quantity: delivery.quantity,
      deliveryDate: delivery.deliveryDate.toISOString(),
      notes: delivery.notes,
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
