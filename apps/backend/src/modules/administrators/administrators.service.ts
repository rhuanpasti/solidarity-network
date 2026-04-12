import { Inject, Injectable } from '@nestjs/common';
import type { CharityProgram } from '@prisma/client';
import type {
  AdministratorSummary,
  CreateAdministratorResult,
  PaginatedResponse,
} from '@solidarity-network/shared';
import { createPaginatedResponse } from '../../common/dto/pagination-response';
import {
  normalizePaginationQuery,
  PaginationQueryDto,
} from '../../common/dto/pagination-query.dto';
import { DomainNotFoundException } from '../../common/exceptions/domain-not-found.exception';
import { CharityProgramsRepository } from '../charity-programs/charity-programs.repository';
import {
  generateNumericPasskey,
  hashPassword,
} from '../auth/password.util';
import { toAdministratorSummary } from './administrators.mapper';
import { AdministratorsRepository } from './administrators.repository';
import { CreateAdministratorDto } from './dto/create-administrator.dto';
import { UpdateAdministratorDto } from './dto/update-administrator.dto';

@Injectable()
export class AdministratorsService {
  constructor(
    @Inject(AdministratorsRepository)
    private readonly repository: AdministratorsRepository,
    @Inject(CharityProgramsRepository)
    private readonly charityProgramsRepository: CharityProgramsRepository,
  ) {}

  async create(dto: CreateAdministratorDto): Promise<CreateAdministratorResult> {
    await this.assertProgramsExist(dto.charityProgramIds);
    const generatedPasskey = generateNumericPasskey(16);

    const administrator = await this.repository.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      role: dto.role,
      credential: {
        create: {
          username: dto.email.trim().toLowerCase(),
          passwordHash: await hashPassword(generatedPasskey),
          mustChangePassword: true,
        },
      },
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

    return {
      administrator: toAdministratorSummary(administrator),
      generatedPasskey,
    };
  }

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<AdministratorSummary>> {
    const normalizedQuery = normalizePaginationQuery(query);
    const skip = (normalizedQuery.page - 1) * normalizedQuery.pageSize;
    const [items, totalItems] = await Promise.all([
      this.repository.findMany(
        skip,
        normalizedQuery.pageSize,
        normalizedQuery.search,
      ),
      this.repository.count(normalizedQuery.search),
    ]);

    return createPaginatedResponse(
      items.map(toAdministratorSummary),
      normalizedQuery.page,
      normalizedQuery.pageSize,
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
