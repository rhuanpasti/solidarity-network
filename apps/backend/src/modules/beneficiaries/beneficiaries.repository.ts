import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryBeneficiariesDto } from './dto/query-beneficiaries.dto';

const beneficiaryInclude = {
  charityProgram: true,
} satisfies Prisma.BeneficiaryInclude;

@Injectable()
export class BeneficiariesRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  create(data: Prisma.BeneficiaryUncheckedCreateInput) {
    return this.prisma.beneficiary.create({
      data,
      include: beneficiaryInclude,
    });
  }

  findMany(query: QueryBeneficiariesDto, skip: number, take: number) {
    return this.prisma.beneficiary.findMany({
      where: {
        charityProgramId: query.charityProgramId,
        status: query.status,
        ...(query.search
          ? {
              OR: [
                { fullName: { contains: query.search, mode: 'insensitive' } },
                { document: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: beneficiaryInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  count(query: QueryBeneficiariesDto) {
    return this.prisma.beneficiary.count({
      where: {
        charityProgramId: query.charityProgramId,
        status: query.status,
        ...(query.search
          ? {
              OR: [
                { fullName: { contains: query.search, mode: 'insensitive' } },
                { document: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
    });
  }

  findById(id: string) {
    return this.prisma.beneficiary.findUnique({
      where: { id },
      include: beneficiaryInclude,
    });
  }

  update(id: string, data: Prisma.BeneficiaryUncheckedUpdateInput) {
    return this.prisma.beneficiary.update({
      where: { id },
      data,
      include: beneficiaryInclude,
    });
  }
}
