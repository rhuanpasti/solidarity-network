import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { ProgramAccessScope } from '../authorization/authorization.types';
import { QueryBeneficiariesDto } from './dto/query-beneficiaries.dto';
import type { BeneficiaryWithPrograms } from './beneficiaries.mapper';

const beneficiaryInclude = {
  dependents: true,
  charityPrograms: {
    include: {
      charityProgram: true,
    },
  },
} satisfies Prisma.BeneficiaryInclude;

@Injectable()
export class BeneficiariesRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  create(data: Prisma.BeneficiaryCreateInput) {
    return this.prisma.beneficiary.create({
      data,
      include: beneficiaryInclude,
    });
  }

  findMany(
    query: QueryBeneficiariesDto,
    skip: number,
    take: number,
    scope?: ProgramAccessScope,
  ) {
    return this.prisma.beneficiary.findMany({
      where: this.buildWhere(query, scope),
      include: beneficiaryInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  count(query: QueryBeneficiariesDto, scope?: ProgramAccessScope) {
    return this.prisma.beneficiary.count({
      where: this.buildWhere(query, scope),
    });
  }

  findById(id: string, scope?: ProgramAccessScope) {
    return this.prisma.beneficiary.findFirst({
      where: this.buildWhere({}, scope, { id }),
      include: beneficiaryInclude,
    });
  }

  findByDocument(document: string) {
    return this.prisma.beneficiary.findUnique({
      where: { document },
      include: beneficiaryInclude,
    });
  }

  async update(
    id: string,
    data: Prisma.BeneficiaryUpdateInput,
    charityProgramIds?: string[],
  ): Promise<BeneficiaryWithPrograms> {
    const operations: Prisma.PrismaPromise<unknown>[] = [];

    if (charityProgramIds) {
      operations.push(
        this.prisma.beneficiaryProgramLink.deleteMany({
          where: { beneficiaryId: id },
        }),
      );

      if (charityProgramIds.length > 0) {
        operations.push(
          this.prisma.beneficiaryProgramLink.createMany({
            data: charityProgramIds.map((charityProgramId) => ({
              beneficiaryId: id,
              charityProgramId,
            })),
            skipDuplicates: true,
          }),
        );
      }
    }

    operations.push(
      this.prisma.beneficiary.update({
        where: { id },
        data,
        include: beneficiaryInclude,
      }),
    );

    const results = await this.prisma.$transaction(operations);
    return results[results.length - 1] as BeneficiaryWithPrograms;
  }

  private buildWhere(
    query: Partial<QueryBeneficiariesDto>,
    scope?: ProgramAccessScope,
    extra?: Prisma.BeneficiaryWhereInput,
  ): Prisma.BeneficiaryWhereInput {
    const filters: Prisma.BeneficiaryWhereInput[] = [];

    if (extra) {
      filters.push(extra);
    }

    if (query.charityProgramId) {
      filters.push({
        charityPrograms: {
          some: {
            charityProgramId: query.charityProgramId,
          },
        },
      });
    }

    if (query.status) {
      filters.push({ status: query.status });
    }

    if (query.search) {
      filters.push({
        OR: [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { document: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    if (scope && !scope.hasGlobalAccess) {
      filters.push({
        charityPrograms: {
          some: {
            charityProgramId: {
              in: scope.allowedProgramIds,
            },
          },
        },
      });
    }

    if (!filters.length) {
      return {};
    }

    return filters.length === 1 ? filters[0]! : { AND: filters };
  }
}
