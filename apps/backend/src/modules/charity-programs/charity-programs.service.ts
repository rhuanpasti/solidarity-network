import { Inject, Injectable } from '@nestjs/common';
import {
  CharityProgramSummary,
  PaginatedResponse,
} from '@solidarity-network/shared';
import { createPaginatedResponse } from '../../common/dto/pagination-response';
import {
  normalizePaginationQuery,
  PaginationQueryDto,
} from '../../common/dto/pagination-query.dto';
import { DomainNotFoundException } from '../../common/exceptions/domain-not-found.exception';
import { CreateCharityProgramDto } from './dto/create-charity-program.dto';
import { UpdateCharityProgramDto } from './dto/update-charity-program.dto';
import { UpdateCharityProgramStatusDto } from './dto/update-charity-program-status.dto';
import { toCharityProgramSummary } from './charity-programs.mapper';
import { CharityProgramsRepository } from './charity-programs.repository';

@Injectable()
export class CharityProgramsService {
  constructor(
    @Inject(CharityProgramsRepository)
    private readonly repository: CharityProgramsRepository,
  ) {}

  async create(dto: CreateCharityProgramDto): Promise<CharityProgramSummary> {
    const program = await this.repository.create({
      ...dto,
      status: dto.status ?? 'active',
    });

    return toCharityProgramSummary(program);
  }

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<CharityProgramSummary>> {
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
      items.map(toCharityProgramSummary),
      normalizedQuery.page,
      normalizedQuery.pageSize,
      totalItems,
    );
  }

  async findOne(id: string): Promise<CharityProgramSummary> {
    const program = await this.repository.findById(id);

    if (!program) {
      throw new DomainNotFoundException('charity_program', id);
    }

    return toCharityProgramSummary(program);
  }

  async update(
    id: string,
    dto: UpdateCharityProgramDto,
  ): Promise<CharityProgramSummary> {
    await this.findOne(id);
    const program = await this.repository.update(id, dto);
    return toCharityProgramSummary(program);
  }

  async updateStatus(
    id: string,
    dto: UpdateCharityProgramStatusDto,
  ): Promise<CharityProgramSummary> {
    await this.findOne(id);
    const program = await this.repository.update(id, { status: dto.status });
    return toCharityProgramSummary(program);
  }
}
