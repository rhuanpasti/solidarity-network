import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BenefitsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.BenefitUncheckedCreateInput) {
    return this.prisma.benefit.create({ data });
  }

  findMany(skip: number, take: number, search?: string) {
    return this.prisma.benefit.findMany({
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
    return this.prisma.benefit.count({
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
    return this.prisma.benefit.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.BenefitUncheckedUpdateInput) {
    return this.prisma.benefit.update({
      where: { id },
      data,
    });
  }
}

