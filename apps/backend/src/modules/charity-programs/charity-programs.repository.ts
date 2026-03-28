import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CharityProgramsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.CharityProgramUncheckedCreateInput) {
    return this.prisma.charityProgram.create({ data });
  }

  findMany(skip: number, take: number, search?: string) {
    return this.prisma.charityProgram.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  count(search?: string) {
    return this.prisma.charityProgram.count({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
    });
  }

  findById(id: string) {
    return this.prisma.charityProgram.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.CharityProgramUncheckedUpdateInput) {
    return this.prisma.charityProgram.update({
      where: { id },
      data,
    });
  }
}

