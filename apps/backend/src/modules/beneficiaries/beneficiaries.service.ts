import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  BeneficiarySummary,
  PaginatedResponse,
} from '@solidarity-network/shared';
import { createPaginatedResponse } from '../../common/dto/pagination-response';
import { DomainNotFoundException } from '../../common/exceptions/domain-not-found.exception';
import { CharityProgramsRepository } from '../charity-programs/charity-programs.repository';
import { BeneficiariesRepository } from './beneficiaries.repository';
import { toBeneficiarySummary } from './beneficiaries.mapper';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { QueryBeneficiariesDto } from './dto/query-beneficiaries.dto';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto';

@Injectable()
export class BeneficiariesService {
  constructor(
    private readonly repository: BeneficiariesRepository,
    private readonly charityProgramsRepository: CharityProgramsRepository,
  ) {}

  async create(dto: CreateBeneficiaryDto): Promise<BeneficiarySummary> {
    await this.assertProgramExists(dto.charityProgramId);
    const beneficiary = await this.repository.create({
      fullName: dto.fullName,
      document: dto.document,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      phone: dto.phone,
      address: dto.address as unknown as Prisma.InputJsonValue,
      notes: dto.notes,
      charityProgramId: dto.charityProgramId,
      status: dto.status ?? 'active',
    });

    return toBeneficiarySummary(beneficiary);
  }

  async findAll(
    query: QueryBeneficiariesDto,
  ): Promise<PaginatedResponse<BeneficiarySummary>> {
    const skip = (query.page - 1) * query.pageSize;
    const [items, totalItems] = await Promise.all([
      this.repository.findMany(query, skip, query.pageSize),
      this.repository.count(query),
    ]);

    return createPaginatedResponse(
      items.map(toBeneficiarySummary),
      query.page,
      query.pageSize,
      totalItems,
    );
  }

  async findOne(id: string): Promise<BeneficiarySummary> {
    const beneficiary = await this.repository.findById(id);

    if (!beneficiary) {
      throw new DomainNotFoundException('beneficiary', id);
    }

    return toBeneficiarySummary(beneficiary);
  }

  async update(id: string, dto: UpdateBeneficiaryDto): Promise<BeneficiarySummary> {
    await this.findOne(id);
    if (dto.charityProgramId) {
      await this.assertProgramExists(dto.charityProgramId);
    }

    const beneficiary = await this.repository.update(id, {
      fullName: dto.fullName,
      document: dto.document,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      phone: dto.phone,
      address: dto.address as unknown as Prisma.InputJsonValue,
      notes: dto.notes,
      charityProgramId: dto.charityProgramId,
      status: dto.status,
    });

    return toBeneficiarySummary(beneficiary);
  }

  private async assertProgramExists(charityProgramId: string) {
    const program = await this.charityProgramsRepository.findById(charityProgramId);

    if (!program) {
      throw new DomainNotFoundException('charity_program', charityProgramId);
    }
  }
}
