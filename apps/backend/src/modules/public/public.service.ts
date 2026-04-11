import { Inject, Injectable } from '@nestjs/common';
import type { LoginMetricsResponse } from '@solidarity-network/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async getLoginMetrics(): Promise<LoginMetricsResponse> {
    const [programs, beneficiaries, deliveries] = await Promise.all([
      this.prisma.charityProgram.count(),
      this.prisma.beneficiary.count(),
      this.prisma.benefitDelivery.count(),
    ]);

    return {
      programs,
      beneficiaries,
      deliveries,
    };
  }
}
