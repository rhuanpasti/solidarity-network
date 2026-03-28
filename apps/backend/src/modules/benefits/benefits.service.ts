import { Injectable } from '@nestjs/common';
import type { BenefitSummary, PaginatedResponse } from '@solidarity-network/shared';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { createPaginatedResponse } from '../../common/dto/pagination-response';
import { DomainNotFoundException } from '../../common/exceptions/domain-not-found.exception';
import { toBenefitSummary } from './benefits.mapper';
import { BenefitsRepository } from './benefits.repository';
import { CreateBenefitDto } from './dto/create-benefit.dto';
import { UpdateBenefitDto } from './dto/update-benefit.dto';
import { UpdateBenefitStatusDto } from './dto/update-benefit-status.dto';

@Injectable()
export class BenefitsService {
  constructor(private readonly repository: BenefitsRepository) {}

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
    const skip = (query.page - 1) * query.pageSize;
    const [items, totalItems] = await Promise.all([
      this.repository.findMany(skip, query.pageSize, query.search),
      this.repository.count(query.search),
    ]);

    return createPaginatedResponse(
      items.map(toBenefitSummary),
      query.page,
      query.pageSize,
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

