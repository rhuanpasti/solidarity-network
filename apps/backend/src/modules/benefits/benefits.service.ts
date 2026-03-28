import { Inject, Injectable } from '@nestjs/common';
import type { BenefitSummary, PaginatedResponse } from '@solidarity-network/shared';
import {
  normalizePaginationQuery,
  PaginationQueryDto,
} from '../../common/dto/pagination-query.dto';
import { createPaginatedResponse } from '../../common/dto/pagination-response';
import { DomainNotFoundException } from '../../common/exceptions/domain-not-found.exception';
import { toBenefitSummary } from './benefits.mapper';
import { BenefitsRepository } from './benefits.repository';
import { CreateBenefitDto } from './dto/create-benefit.dto';
import { UpdateBenefitDto } from './dto/update-benefit.dto';
import { UpdateBenefitStatusDto } from './dto/update-benefit-status.dto';

@Injectable()
export class BenefitsService {
  constructor(
    @Inject(BenefitsRepository)
    private readonly repository: BenefitsRepository,
  ) {}

  async create(dto: CreateBenefitDto): Promise<BenefitSummary> {
    const benefit = await this.repository.create({
      ...dto,
      active: dto.active ?? true,
    });
    return toBenefitSummary(benefit);
  }

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<BenefitSummary>> {
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
      items.map(toBenefitSummary),
      normalizedQuery.page,
      normalizedQuery.pageSize,
      totalItems,
    );
  }

  async findOne(id: string): Promise<BenefitSummary> {
    const benefit = await this.repository.findById(id);

    if (!benefit) {
      throw new DomainNotFoundException('benefit', id);
    }

    return toBenefitSummary(benefit);
  }

  async update(id: string, dto: UpdateBenefitDto): Promise<BenefitSummary> {
    await this.findOne(id);
    const benefit = await this.repository.update(id, dto);
    return toBenefitSummary(benefit);
  }

  async updateStatus(
    id: string,
    dto: UpdateBenefitStatusDto,
  ): Promise<BenefitSummary> {
    await this.findOne(id);
    const benefit = await this.repository.update(id, { active: dto.active });
    return toBenefitSummary(benefit);
  }
}
