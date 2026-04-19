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
      dto.charityProgramIds ?? [],
      {
        action: 'beneficiary.create',
      },
    );
    await this.assertProgramsExist(dto.charityProgramIds);
    const normalizedInput = normalizeBeneficiaryInput({
      document: dto.document,
      phone: dto.phone,
      address: dto.address,
    });
    this.assertValidBeneficiaryInput(normalizedInput);
    await this.assertDocumentAvailable(normalizedInput.document);
    const generatedPasskey = generateNumericPasskey(16);
    let beneficiary;
    try {
      beneficiary = await this.repository.create({
        fullName: dto.fullName,
        document: normalizedInput.document,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        email: dto.email.trim().toLowerCase(),
        phone: normalizedInput.phone,
        passwordHash: await hashPassword(generatedPasskey),
        mustChangePassword: true,
        address: normalizedInput.address as unknown as Prisma.InputJsonValue,
        notes: dto.notes,
        charityPrograms: dto.charityProgramIds?.length
          ? {
              create: dto.charityProgramIds.map((charityProgramId) => ({
                charityProgram: {
                  connect: { id: charityProgramId },
                },
              })),
            }
          : undefined,
        status: dto.status ?? 'active',
      });
    } catch (error) {
      this.rethrowUniqueDocumentError(error);
      throw error;
    }

    await this.auditTrailService.record({
      action: 'beneficiary.create',
      entityType: 'beneficiary',
      entityId: beneficiary.id,
      actor,
      metadata: {
        charityProgramIds: beneficiary.charityPrograms.map((link) => link.charityProgramId),
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

    if (dto.charityProgramIds !== undefined) {
      this.authorizationService.assertCanEditBeneficiary(
        actor,
        dto.charityProgramIds,
        {
          action: 'beneficiary.reassign_program',
          beneficiaryId: id,
        },
      );
      await this.assertProgramsExist(dto.charityProgramIds);
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
    await this.assertDocumentAvailable(normalizedInput.document, id);

    this.authorizationService.assertCanEditBeneficiary(
      actor,
      existingBeneficiary.charityPrograms.map((link) => link.charityProgramId),
      {
        action: 'beneficiary.update',
        beneficiaryId: id,
      },
    );

    let beneficiary;
    try {
      beneficiary = await this.repository.update(id, {
        fullName: dto.fullName,
        document: dto.document ? normalizedInput.document : undefined,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        email: dto.email?.trim().toLowerCase(),
        phone: dto.phone ? normalizedInput.phone : undefined,
        address: dto.address
          ? (normalizedInput.address as unknown as Prisma.InputJsonValue)
          : undefined,
        notes: dto.notes,
        status: dto.status,
      }, dto.charityProgramIds);
    } catch (error) {
      this.rethrowUniqueDocumentError(error);
      throw error;
    }

    await this.auditTrailService.record({
      action: 'beneficiary.update',
      entityType: 'beneficiary',
      entityId: beneficiary.id,
      actor,
      metadata: {
        updatedFields: Object.keys(dto).filter(
          (key) =>
            (dto as Record<string, unknown>)[key] !== undefined &&
            key !== 'address',
        ),
        updatedAddress: dto.address !== undefined,
        charityProgramIds: beneficiary.charityPrograms.map((link) => link.charityProgramId),
        status: beneficiary.status,
      },
    });

    return toBeneficiarySummary(beneficiary);
  }

  private async assertProgramsExist(charityProgramIds?: string[]) {
    if (!charityProgramIds?.length) {
      return;
    }

    const results = await Promise.all(
      charityProgramIds.map((charityProgramId) =>
        this.charityProgramsRepository.findById(charityProgramId),
      ),
    );
    const missingIndex = results.findIndex((program) => !program);

    if (missingIndex >= 0) {
      throw new DomainNotFoundException('charity_program', charityProgramIds[missingIndex]!);
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

  private async assertDocumentAvailable(document: string, currentBeneficiaryId?: string) {
    const existingBeneficiary = await this.repository.findByDocument(document);

    if (!existingBeneficiary || existingBeneficiary.id === currentBeneficiaryId) {
      return;
    }

    throw new BadRequestException({
      code: 'BENEFICIARY_DOCUMENT_ALREADY_EXISTS',
      message: 'A beneficiary with this document already exists.',
      details: [
        {
          field: 'document',
          code: 'beneficiaryDocumentAlreadyExists',
          message: 'A beneficiary with this document already exists.',
        },
      ],
    });
  }

  private rethrowUniqueDocumentError(error: unknown): never | void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes('document')
    ) {
      throw new BadRequestException({
        code: 'BENEFICIARY_DOCUMENT_ALREADY_EXISTS',
        message: 'A beneficiary with this document already exists.',
        details: [
          {
            field: 'document',
            code: 'beneficiaryDocumentAlreadyExists',
            message: 'A beneficiary with this document already exists.',
          },
        ],
      });
    }
  }
}
