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
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditTrailService } from '../observability/audit-trail.service';
import { AuthorizationService } from '../authorization/authorization.service';
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
    @Inject(AuditTrailService)
    private readonly auditTrailService: AuditTrailService,
    @Inject(AuthorizationService)
    private readonly authorizationService: AuthorizationService,
    @Inject(BeneficiariesRepository)
    private readonly repository: BeneficiariesRepository,
    @Inject(CharityProgramsRepository)
    private readonly charityProgramsRepository: CharityProgramsRepository,
  ) {}

  async create(
    dto: CreateBeneficiaryDto,
    actor: AuthenticatedUser,
  ): Promise<CreateBeneficiaryResult> {
    this.authorizationService.assertCanEditBeneficiary(
      actor,
      dto.charityProgramId,
      {
        action: 'beneficiary.create',
      },
    );
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

    await this.auditTrailService.record({
      action: 'beneficiary.create',
      entityType: 'beneficiary',
      entityId: beneficiary.id,
      charityProgramId: beneficiary.charityProgramId,
      actor,
      metadata: {
        status: beneficiary.status,
      },
    });

    return {
      beneficiary: toBeneficiarySummary(beneficiary),
      generatedPasskey,
    };
  }

  async findAll(
    query: QueryBeneficiariesDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedResponse<BeneficiarySummary>> {
    const normalizedQuery = normalizePaginationQuery(query);
    const skip = (normalizedQuery.page - 1) * normalizedQuery.pageSize;
    const scope = this.authorizationService.getProgramScope(actor);
    const [items, totalItems] = await Promise.all([
      this.repository.findMany(
        normalizedQuery,
        skip,
        normalizedQuery.pageSize,
        scope,
      ),
      this.repository.count(normalizedQuery, scope),
    ]);

    return createPaginatedResponse(
      items.map(toBeneficiarySummary),
      normalizedQuery.page,
      normalizedQuery.pageSize,
      totalItems,
    );
  }

  async findOne(id: string, actor: AuthenticatedUser): Promise<BeneficiarySummary> {
    const beneficiary = await this.repository.findById(
      id,
      this.authorizationService.getProgramScope(actor),
    );

    if (!beneficiary) {
      throw new DomainNotFoundException('beneficiary', id);
    }

    return toBeneficiarySummary(beneficiary);
  }

  async update(
    id: string,
    dto: UpdateBeneficiaryDto,
    actor: AuthenticatedUser,
  ): Promise<BeneficiarySummary> {
    const existingBeneficiary = await this.repository.findById(
      id,
      this.authorizationService.getProgramScope(actor),
    );

    if (!existingBeneficiary) {
      throw new DomainNotFoundException('beneficiary', id);
    }

    if (dto.charityProgramId !== undefined) {
      this.authorizationService.assertCanEditBeneficiary(
        actor,
        dto.charityProgramId,
        {
          action: 'beneficiary.reassign_program',
          beneficiaryId: id,
        },
      );
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

    this.authorizationService.assertCanEditBeneficiary(
      actor,
      existingBeneficiary.charityProgramId,
      {
        action: 'beneficiary.update',
        beneficiaryId: id,
      },
    );

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

    await this.auditTrailService.record({
      action: 'beneficiary.update',
      entityType: 'beneficiary',
      entityId: beneficiary.id,
      charityProgramId: beneficiary.charityProgramId,
      actor,
      metadata: {
        updatedFields: Object.keys(dto).filter(
          (key) =>
            (dto as Record<string, unknown>)[key] !== undefined &&
            key !== 'address',
        ),
        updatedAddress: dto.address !== undefined,
        status: beneficiary.status,
      },
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
