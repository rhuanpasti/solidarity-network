import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type AdministratorProgramLink } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { ProgramAccessScope } from '../authorization/authorization.types';
import type { AdministratorWithPrograms } from './administrators.mapper';

const administratorInclude = {
  charityPrograms: {
    include: {
      charityProgram: true,
    },
  },
} satisfies Prisma.AdministratorInclude;

@Injectable()
export class AdministratorsRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  create(data: Prisma.AdministratorCreateInput) {
    return this.prisma.administrator.create({
      data,
      include: administratorInclude,
    });
  }

  findMany(
    skip: number,
    take: number,
    search?: string,
    scope?: ProgramAccessScope,
  ) {
    return this.prisma.administrator.findMany({
      where: this.buildVisibleAdministratorWhere(search, scope),
      include: administratorInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  count(search?: string, scope?: ProgramAccessScope) {
    return this.prisma.administrator.count({
      where: this.buildVisibleAdministratorWhere(search, scope),
    });
  }

  findById(id: string, scope?: ProgramAccessScope) {
    return this.prisma.administrator.findFirst({
      where: this.buildVisibleAdministratorWhere(undefined, scope, { id }),
      include: administratorInclude,
    });
  }

  findAnyById(id: string) {
    return this.prisma.administrator.findUnique({
      where: { id },
      include: administratorInclude,
    });
  }

  async update(
    id: string,
    data: Prisma.AdministratorUpdateInput,
    charityProgramIds?: string[],
  ): Promise<AdministratorWithPrograms> {
    const operations: Prisma.PrismaPromise<unknown>[] = [];

    if (charityProgramIds) {
      operations.push(
        this.prisma.administratorProgramLink.deleteMany({
          where: { administratorId: id },
        }),
      );

      if (charityProgramIds.length > 0) {
        operations.push(
          this.prisma.administratorProgramLink.createMany({
            data: charityProgramIds.map((charityProgramId) => ({
              administratorId: id,
              charityProgramId,
            })),
            skipDuplicates: true,
          }),
        );
      }
    }

    operations.push(
      this.prisma.administrator.update({
        where: { id },
        data,
        include: administratorInclude,
      }),
    );

    const results = await this.prisma.$transaction(operations);
    return results[results.length - 1] as AdministratorWithPrograms;
  }

  updateCredential(
    administratorId: string,
    data: Prisma.AuthCredentialUpdateInput,
  ) {
    return this.prisma.authCredential.update({
      where: { administratorId },
      data,
    });
  }

  findProgramLinks(administratorId: string): Promise<AdministratorProgramLink[]> {
    return this.prisma.administratorProgramLink.findMany({
      where: { administratorId },
    });
  }

  private buildVisibleAdministratorWhere(
    search?: string,
    scope?: ProgramAccessScope,
    extra?: Prisma.AdministratorWhereInput,
  ): Prisma.AdministratorWhereInput {
    const filters: Prisma.AdministratorWhereInput[] = [
      { isSystemRoot: false },
    ];

    if (extra) {
      filters.push(extra);
    }

    if (search) {
      filters.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const scopeWhere = this.buildProgramScopeWhere(scope);
    if (scopeWhere) {
      filters.push(scopeWhere);
    }

    return filters.length === 1 ? filters[0]! : { AND: filters };
  }

  private buildProgramScopeWhere(scope?: ProgramAccessScope) {
    if (!scope || scope.hasGlobalAccess) {
      return undefined;
    }

    return {
      charityPrograms: {
        some: {
          charityProgramId: {
            in: scope.allowedProgramIds,
          },
        },
      },
    } satisfies Prisma.AdministratorWhereInput;
  }
}
