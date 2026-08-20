import { BadRequestException, Inject, Injectable, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
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
import { EntityVersioningService } from '../observability/entity-versioning.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { CharityProgramsRepository } from '../charity-programs/charity-programs.repository';
import { EmailService } from '../email/email.service';
import { BeneficiariesRepository } from './beneficiaries.repository';
import {
  getBeneficiaryValidationErrors,
  normalizeBeneficiaryInput,
} from './beneficiary-validation';
import { toBeneficiarySummary } from './beneficiaries.mapper';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { QueryBeneficiariesDto } from './dto/query-beneficiaries.dto';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto';
import { rethrowBeneficiaryUniqueError } from './beneficiary-unique-error';
import { DemoDataService } from '../demo/demo-data.service';

@Injectable()
export class BeneficiariesService {
  constructor(
    @Inject(AuditTrailService)
    private readonly auditTrailService: AuditTrailService,
    @Inject(EntityVersioningService)
    private readonly entityVersioningService: EntityVersioningService,
    @Inject(AuthorizationService)
    private readonly authorizationService: AuthorizationService,
    @Inject(BeneficiariesRepository)
    private readonly repository: BeneficiariesRepository,
    @Inject(CharityProgramsRepository)
    private readonly charityProgramsRepository: CharityProgramsRepository,
    @Inject(EmailService)
    private readonly emailService: EmailService,
    @Optional()
    @Inject(DemoDataService)
    private readonly demoDataService?: DemoDataService,
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
    this.authorizationService.assertCanAssignBeneficiaryPrograms(
      actor,
      dto.charityProgramIds ?? [],
      { action: 'beneficiary.create' },
    );
    this.assertDependentsDisabled(dto.dependents);
    if (this.demoDataService?.isDemoUser(actor)) {
      return this.demoDataService.previewBeneficiary({
        fullName: dto.fullName,
        document: dto.document,
        birthDate: dto.birthDate,
        email: dto.email,
        phone: dto.phone,
        address: dto.address as Address,
        notes: dto.notes,
        charityProgramIds: dto.charityProgramIds,
        status: dto.status ?? 'active',
      });
    }
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
        email: dto.email?.trim().toLowerCase(),
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
      rethrowBeneficiaryUniqueError(error);
      throw error;
    }

    const newSnapshot = this.toAuditSnapshot(beneficiary);

    await this.auditTrailService.record({
      action: 'beneficiary.create',
      entityType: 'beneficiary',
      entityId: beneficiary.id,
      actor,
      changedFields: Object.keys(newSnapshot),
      previousValues: null,
      newValues: newSnapshot,
      metadata: {
        charityProgramIds: beneficiary.charityPrograms.map((link) => link.charityProgramId),
        status: beneficiary.status,
      },
    });
    await this.entityVersioningService.recordVersion({
      entityType: 'beneficiary',
      entityId: beneficiary.id,
      action: 'beneficiary.create',
      actor,
      changedFields: Object.keys(newSnapshot),
      snapshot: newSnapshot,
      diff: {
        previousValues: null,
        newValues: newSnapshot,
      },
    });

    await this.sendTemporaryPasswordEmail({
      email: beneficiary.email,
      name: beneficiary.fullName,
      temporaryPassword: generatedPasskey,
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
    if (this.demoDataService?.isDemoUser(actor)) {
      return this.demoDataService.listBeneficiaries(query);
    }
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
    if (this.demoDataService?.isDemoUser(actor)) {
      return this.demoDataService.getBeneficiary(id);
    }
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
    this.assertDependentsDisabled(dto.dependents);
    if (this.demoDataService?.isDemoUser(actor)) {
      return this.demoDataService.getBeneficiary(id);
    }
    const existingBeneficiary = await this.repository.findById(
      id,
      this.authorizationService.getProgramScope(actor),
    );

    if (!existingBeneficiary) {
      throw new DomainNotFoundException('beneficiary', id);
    }

    if (dto.charityProgramIds !== undefined) {
      this.authorizationService.assertCanAssignBeneficiaryPrograms(
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

    const previousSnapshot = this.toAuditSnapshot(existingBeneficiary);
    let beneficiary;
    try {
      beneficiary = await this.repository.update(id, {
        fullName: dto.fullName,
        document: dto.document ? normalizedInput.document : undefined,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        email:
          dto.email === undefined
            ? undefined
            : dto.email.trim().toLowerCase() || null,
        phone: dto.phone ? normalizedInput.phone : undefined,
        address: dto.address
          ? (normalizedInput.address as unknown as Prisma.InputJsonValue)
          : undefined,
        notes: dto.notes,
        status: dto.status,
      }, dto.charityProgramIds);
    } catch (error) {
      rethrowBeneficiaryUniqueError(error);
      throw error;
    }
    const newSnapshot = this.toAuditSnapshot(beneficiary);
    const auditChanges = this.getAuditChanges(previousSnapshot, newSnapshot);

    await this.auditTrailService.record({
      action: 'beneficiary.update',
      entityType: 'beneficiary',
      entityId: beneficiary.id,
      actor,
      changedFields: auditChanges.changedFields,
      previousValues: auditChanges.previousValues,
      newValues: auditChanges.newValues,
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
    await this.entityVersioningService.recordVersion({
      entityType: 'beneficiary',
      entityId: beneficiary.id,
      action: 'beneficiary.update',
      actor,
      changedFields: auditChanges.changedFields,
      snapshot: newSnapshot,
      diff: auditChanges,
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

  /**
   * Temporarily disables dependent persistence and exposure while the feature
   * is being revisited. The Prisma model and migration remain available for a
   * future re-enable without changing the database schema.
   */
  private assertDependentsDisabled(dependents?: unknown[]) {
    if (!dependents?.length) {
      return;
    }

    throw new BadRequestException({
      code: 'BENEFICIARY_DEPENDENTS_DISABLED',
      message: 'Beneficiary dependents are temporarily disabled.',
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

  private toAuditSnapshot(beneficiary: {
    fullName: string;
    document: string;
    birthDate: Date | null;
    email: string | null;
    phone: string;
    address: unknown;
    notes: string | null;
    status: string;
    charityPrograms: Array<{ charityProgramId: string }>;
  }) {
    return {
      fullName: beneficiary.fullName,
      document: beneficiary.document,
      birthDate: beneficiary.birthDate?.toISOString() ?? null,
      email: beneficiary.email,
      phone: beneficiary.phone,
      address: beneficiary.address,
      notes: beneficiary.notes,
      status: beneficiary.status,
      dependents: [],
      charityProgramIds: beneficiary.charityPrograms
        .map((link) => link.charityProgramId)
        .sort(),
    };
  }

  private getAuditChanges(
    previousSnapshot: Record<string, unknown>,
    newSnapshot: Record<string, unknown>,
  ) {
    const changedFields = Object.keys(newSnapshot).filter(
      (key) =>
        JSON.stringify(previousSnapshot[key]) !== JSON.stringify(newSnapshot[key]),
    );

    return {
      changedFields,
      previousValues: Object.fromEntries(
        changedFields.map((field) => [field, previousSnapshot[field]]),
      ),
      newValues: Object.fromEntries(
        changedFields.map((field) => [field, newSnapshot[field]]),
      ),
    };
  }

  private async sendTemporaryPasswordEmail(payload: {
    email: string | null;
    name: string;
    temporaryPassword: string;
  }) {
    if (!payload.email) {
      return;
    }

    try {
      await this.emailService.send({
        to: {
          email: payload.email,
          name: payload.name,
        },
        template: 'temporary-password',
        variables: {
          userName: payload.name,
          email: payload.email,
          temporaryPassword: payload.temporaryPassword,
          organizationName: 'Solidarity Network',
        },
      });
    } catch {
      await this.auditTrailService.record({
        action: 'beneficiary.temporary_password_email.failed',
        status: 'failure',
        metadata: {
          emailFingerprint: this.buildEmailFingerprint(payload.email),
        },
      });
    }
  }

  private buildEmailFingerprint(email: string) {
    return createHash('sha256')
      .update(email.trim().toLowerCase())
      .digest('hex')
      .slice(0, 16);
  }
}
