import { Inject, Injectable } from '@nestjs/common';
import type { LoginMetricsResponse } from '@solidarity-network/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PublicService {
  private cachedMetrics: LoginMetricsResponse | null = null;
  private cachedAt = 0;

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async getLoginMetrics(): Promise<LoginMetricsResponse> {
    if (this.cachedMetrics && Date.now() - this.cachedAt < 60_000) {
      return this.cachedMetrics;
    }

    const [programs, beneficiaries, deliveries] = await Promise.all([
      this.prisma.charityProgram.count(),
      this.prisma.beneficiary.count(),
      this.prisma.benefitDelivery.count(),
    ]);

    this.cachedMetrics = {
      programs,
      beneficiaries,
      deliveries,
    };
    this.cachedAt = Date.now();
    return this.cachedMetrics;
  }
}
