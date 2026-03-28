import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type AdministratorProgramLink } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
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

  findMany(skip: number, take: number, search?: string) {
    return this.prisma.administrator.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: administratorInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  count(search?: string) {
    return this.prisma.administrator.count({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
    });
  }

  findById(id: string) {
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

  findProgramLinks(administratorId: string): Promise<AdministratorProgramLink[]> {
    return this.prisma.administratorProgramLink.findMany({
      where: { administratorId },
    });
  }
}
