import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  Address,
  BeneficiarySummary,
  CreateBeneficiaryResult,
  PaginatedResponse,
} from '@solidarity-network/shared';
import { createPaginatedResponse } from '../../common/dto/pagination-response';
import { normalizePaginationQuery } from '../../common/dto/pagination-query.dto';
import { DomainNotFoundException } from '../../common/exceptions/domain-not-found.exception';
import {
  generateNumericPasskey,
  hashPassword,
} from '../auth/password.util';
import { CharityProgramsRepository } from '../charity-programs/charity-programs.repository';
import { BeneficiariesRepository } from './beneficiaries.repository';
import {
  getBeneficiaryValidationErrors,
  normalizeBeneficiaryInput,
} from './beneficiary-validation';
import { toBeneficiarySummary } from './beneficiaries.mapper';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { QueryBeneficiariesDto } from './dto/query-beneficiaries.dto';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto';

@Injectable()
export class BeneficiariesService {
  constructor(
    @Inject(BeneficiariesRepository)
    private readonly repository: BeneficiariesRepository,
    @Inject(CharityProgramsRepository)
    private readonly charityProgramsRepository: CharityProgramsRepository,
  ) {}

  async create(dto: CreateBeneficiaryDto): Promise<CreateBeneficiaryResult> {
    await this.assertProgramExists(dto.charityProgramId);
    const normalizedInput = normalizeBeneficiaryInput({
      document: dto.document,
      phone: dto.phone,
      address: dto.address,
    });
    this.assertValidBeneficiaryInput(normalizedInput);
    const generatedPasskey = generateNumericPasskey(16);

    const beneficiary = await this.repository.create({
      fullName: dto.fullName,
      document: normalizedInput.document,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      email: dto.email.trim().toLowerCase(),
      phone: normalizedInput.phone,
      passwordHash: await hashPassword(generatedPasskey),
      mustChangePassword: true,
      address: normalizedInput.address as unknown as Prisma.InputJsonValue,
      notes: dto.notes,
      charityProgramId: dto.charityProgramId ?? undefined,
      status: dto.status ?? 'active',
    });

    return {
      beneficiary: toBeneficiarySummary(beneficiary),
      generatedPasskey,
    };
  }

  async findAll(
    query: QueryBeneficiariesDto,
  ): Promise<PaginatedResponse<BeneficiarySummary>> {
    const normalizedQuery = normalizePaginationQuery(query);
    const skip = (normalizedQuery.page - 1) * normalizedQuery.pageSize;
    const [items, totalItems] = await Promise.all([
      this.repository.findMany(normalizedQuery, skip, normalizedQuery.pageSize),
      this.repository.count(normalizedQuery),
    ]);

    return createPaginatedResponse(
      items.map(toBeneficiarySummary),
      normalizedQuery.page,
      normalizedQuery.pageSize,
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
    const existingBeneficiary = await this.repository.findById(id);

    if (!existingBeneficiary) {
      throw new DomainNotFoundException('beneficiary', id);
    }

    if (dto.charityProgramId !== undefined) {
      await this.assertProgramExists(dto.charityProgramId);
    }

    const mergedAddress = {
      ...(existingBeneficiary.address as unknown as Address),
      ...(dto.address ?? {}),
    };
    const normalizedInput = normalizeBeneficiaryInput({
      document: dto.document ?? existingBeneficiary.document,
      phone: dto.phone ?? existingBeneficiary.phone,
      address: mergedAddress,
    });
    this.assertValidBeneficiaryInput(normalizedInput);

    const beneficiary = await this.repository.update(id, {
      fullName: dto.fullName,
      document: dto.document ? normalizedInput.document : undefined,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      email: dto.email?.trim().toLowerCase(),
      phone: dto.phone ? normalizedInput.phone : undefined,
      address: dto.address
        ? (normalizedInput.address as unknown as Prisma.InputJsonValue)
        : undefined,
      notes: dto.notes,
      charityProgramId: dto.charityProgramId,
      status: dto.status,
    });

    return toBeneficiarySummary(beneficiary);
  }

  private async assertProgramExists(charityProgramId?: string | null) {
    if (!charityProgramId) {
      return;
    }

    const program = await this.charityProgramsRepository.findById(charityProgramId);

    if (!program) {
      throw new DomainNotFoundException('charity_program', charityProgramId);
    }
  }

  private assertValidBeneficiaryInput(input: {
    document: string;
    phone: string;
    address: Address;
  }) {
    const errors = getBeneficiaryValidationErrors(input);

    if (!errors.length) {
      return;
    }

    throw new BadRequestException({
      code: 'INVALID_BENEFICIARY_DATA',
      message: errors[0],
      details: errors,
    });
  }
}
