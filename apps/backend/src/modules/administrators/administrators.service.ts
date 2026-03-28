import { Injectable } from '@nestjs/common';
import type { CharityProgram } from '@prisma/client';
import type {
  AdministratorSummary,
  PaginatedResponse,
} from '@solidarity-network/shared';
import { createPaginatedResponse } from '../../common/dto/pagination-response';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { DomainNotFoundException } from '../../common/exceptions/domain-not-found.exception';
import { CharityProgramsRepository } from '../charity-programs/charity-programs.repository';
import { toAdministratorSummary } from './administrators.mapper';
import { AdministratorsRepository } from './administrators.repository';
import { CreateAdministratorDto } from './dto/create-administrator.dto';
import { UpdateAdministratorDto } from './dto/update-administrator.dto';

@Injectable()
export class AdministratorsService {
  constructor(
    private readonly repository: AdministratorsRepository,
    private readonly charityProgramsRepository: CharityProgramsRepository,
  ) {}

  async create(dto: CreateAdministratorDto): Promise<AdministratorSummary> {
    await this.assertProgramsExist(dto.charityProgramIds);

    const administrator = await this.repository.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      role: dto.role,
      charityPrograms: dto.charityProgramIds?.length
        ? {
            create: dto.charityProgramIds.map((charityProgramId) => ({
              charityProgram: {
                connect: { id: charityProgramId },
              },
            })),
          }
        : undefined,
    });

    return toAdministratorSummary(administrator);
  }

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<AdministratorSummary>> {
    const skip = (query.page - 1) * query.pageSize;
    const [items, totalItems] = await Promise.all([
      this.repository.findMany(skip, query.pageSize, query.search),
      this.repository.count(query.search),
    ]);

    return createPaginatedResponse(
      items.map(toAdministratorSummary),
      query.page,
      query.pageSize,
      totalItems,
    );
  }

  async findOne(id: string): Promise<AdministratorSummary> {
    const administrator = await this.repository.findById(id);

    if (!administrator) {
      throw new DomainNotFoundException('administrator', id);
    }

    return toAdministratorSummary(administrator);
  }

  async update(
    id: string,
    dto: UpdateAdministratorDto,
  ): Promise<AdministratorSummary> {
    await this.findOne(id);
    await this.assertProgramsExist(dto.charityProgramIds);

    const administrator = await this.repository.update(
      id,
      {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        role: dto.role,
      },
      dto.charityProgramIds,
    );

    return toAdministratorSummary(administrator);
  }

  private async assertProgramsExist(charityProgramIds?: string[]) {
    if (!charityProgramIds?.length) {
      return;
    }

    const programs = await Promise.all(
      charityProgramIds.map((programId) =>
        this.charityProgramsRepository.findById(programId),
      ),
    );

    const missingProgramId = programs.findIndex(
      (program: CharityProgram | null) => !program,
    );
    if (missingProgramId >= 0) {
      throw new DomainNotFoundException(
        'charity_program',
        charityProgramIds[missingProgramId]!,
      );
    }
  }
}
