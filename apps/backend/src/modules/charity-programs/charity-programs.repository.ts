import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import type { ProgramAccessScope } from '../authorization/authorization.types';

@Injectable()
export class CharityProgramsRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  create(data: Prisma.CharityProgramUncheckedCreateInput) {
    return this.prisma.charityProgram.create({ data });
  }

  findMany(
    skip: number,
    take: number,
    search?: string,
    scope?: ProgramAccessScope,
  ) {
    return this.prisma.charityProgram.findMany({
      where: this.buildWhere(search, scope),
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  count(search?: string, scope?: ProgramAccessScope) {
    return this.prisma.charityProgram.count({
      where: this.buildWhere(search, scope),
    });
  }

  findById(id: string, scope?: ProgramAccessScope) {
    return this.prisma.charityProgram.findFirst({
      where: this.buildWhere(undefined, scope, { id }),
    });
  }

  update(id: string, data: Prisma.CharityProgramUncheckedUpdateInput) {
    return this.prisma.charityProgram.update({
      where: { id },
      data,
    });
  }

  private buildWhere(
    search?: string,
    scope?: ProgramAccessScope,
    extra?: Prisma.CharityProgramWhereInput,
  ): Prisma.CharityProgramWhereInput | undefined {
    const filters: Prisma.CharityProgramWhereInput[] = [];

    if (extra) {
      filters.push(extra);
    }

    if (search) {
      filters.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (scope && !scope.hasGlobalAccess) {
      filters.push({
        id: {
          in: scope.allowedProgramIds,
        },
      });
    }

    if (!filters.length) {
      return undefined;
    }

    return filters.length === 1 ? filters[0] : { AND: filters };
  }
}
