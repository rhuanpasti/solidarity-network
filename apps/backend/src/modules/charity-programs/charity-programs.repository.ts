import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import type { CharityProgramStatus } from '@solidarity-network/shared';
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
    status?: CharityProgramStatus,
    scope?: ProgramAccessScope,
  ) {
    return this.prisma.charityProgram.findMany({
      where: buildCharityProgramWhere(search, status, scope),
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  count(search?: string, status?: CharityProgramStatus, scope?: ProgramAccessScope) {
    return this.prisma.charityProgram.count({
      where: buildCharityProgramWhere(search, status, scope),
    });
  }

  findById(id: string, scope?: ProgramAccessScope) {
    return this.prisma.charityProgram.findFirst({
      where: buildCharityProgramWhere(undefined, undefined, scope, { id }),
    });
  }

  update(id: string, data: Prisma.CharityProgramUncheckedUpdateInput) {
    return this.prisma.charityProgram.update({
      where: { id },
      data,
    });
  }
}

export function buildCharityProgramWhere(
  search?: string,
  status?: CharityProgramStatus,
  scope?: ProgramAccessScope,
  extra?: Prisma.CharityProgramWhereInput,
): Prisma.CharityProgramWhereInput | undefined {
  const filters: Prisma.CharityProgramWhereInput[] = [];

  if (extra) {
    filters.push(extra);
  }

  if (status) {
    filters.push({ status });
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
