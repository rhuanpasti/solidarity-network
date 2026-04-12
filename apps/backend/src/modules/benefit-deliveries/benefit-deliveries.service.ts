import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import type { AdministratorProgramLink } from '@prisma/client';
import type {
  BenefitDeliverySummary,
  PaginatedResponse,
} from '@solidarity-network/shared';
import { DomainNotFoundException } from '../../common/exceptions/domain-not-found.exception';
import { normalizePaginationQuery } from '../../common/dto/pagination-query.dto';
import { createPaginatedResponse } from '../../common/dto/pagination-response';
import { AdministratorsRepository } from '../administrators/administrators.repository';
import { BeneficiariesRepository } from '../beneficiaries/beneficiaries.repository';
import { BenefitsRepository } from '../benefits/benefits.repository';
import { CharityProgramsRepository } from '../charity-programs/charity-programs.repository';
import { BenefitDeliveriesRepository } from './benefit-deliveries.repository';
import { toBenefitDeliverySummary } from './benefit-deliveries.mapper';
import { CreateBenefitDeliveryDto } from './dto/create-benefit-delivery.dto';
import { QueryBenefitDeliveriesDto } from './dto/query-benefit-deliveries.dto';

@Injectable()
export class BenefitDeliveriesService {
  private readonly logger = new Logger(BenefitDeliveriesService.name);

  constructor(
    @Inject(BenefitDeliveriesRepository)
    private readonly repository: BenefitDeliveriesRepository,
    @Inject(BeneficiariesRepository)
    private readonly beneficiariesRepository: BeneficiariesRepository,
    @Inject(BenefitsRepository)
    private readonly benefitsRepository: BenefitsRepository,
    @Inject(CharityProgramsRepository)
    private readonly charityProgramsRepository: CharityProgramsRepository,
    @Inject(AdministratorsRepository)
    private readonly administratorsRepository: AdministratorsRepository,
  ) {}

  async create(
    dto: CreateBenefitDeliveryDto,
    authenticatedAdministratorId: string,
  ): Promise<BenefitDeliverySummary> {
    const [beneficiary, benefit, charityProgram, administrator] = await Promise.all([
      this.beneficiariesRepository.findById(dto.beneficiaryId),
      this.benefitsRepository.findById(dto.benefitId),
      this.charityProgramsRepository.findById(dto.charityProgramId),
      this.administratorsRepository.findById(authenticatedAdministratorId),
    ]);

    if (!beneficiary) {
      throw new DomainNotFoundException('beneficiary', dto.beneficiaryId);
    }
    if (!benefit) {
      throw new DomainNotFoundException('benefit', dto.benefitId);
    }
    if (!charityProgram) {
      throw new DomainNotFoundException('charity_program', dto.charityProgramId);
    }
    if (!administrator) {
      throw new DomainNotFoundException('administrator', authenticatedAdministratorId);
    }
    if (!benefit.active) {
      throw new BadRequestException({
        code: 'BENEFIT_INACTIVE',
        message: 'Cannot register a delivery for an inactive benefit.',
      });
    }
    if (beneficiary.charityProgramId !== dto.charityProgramId) {
      throw new BadRequestException({
        code: 'BENEFICIARY_PROGRAM_MISMATCH',
        message: 'Beneficiary must belong to the selected charity program.',
      });
    }

    const programIds = administrator.charityPrograms.map(
      (link: AdministratorProgramLink) => link.charityProgramId,
    );
    if (
      administrator.role !== 'super_admin' &&
      !programIds.includes(dto.charityProgramId)
    ) {
      throw new BadRequestException({
        code: 'ADMINISTRATOR_NOT_ASSIGNED',
        message: 'Administrator must be assigned to the selected charity program.',
      });
    }

    const delivery = await this.repository.create({
      beneficiaryId: dto.beneficiaryId,
      benefitId: dto.benefitId,
      charityProgramId: dto.charityProgramId,
      quantity: dto.quantity,
      deliveryDate: new Date(dto.deliveryDate),
      notes: dto.notes,
      administratorId: authenticatedAdministratorId,
      reference: dto.reference,
    });

    this.logAudit('benefit_delivery.create', {
      actorAdministratorId: authenticatedAdministratorId,
      deliveryId: delivery.id,
      beneficiaryId: dto.beneficiaryId,
      benefitId: dto.benefitId,
      charityProgramId: dto.charityProgramId,
      quantity: dto.quantity,
    });

    return toBenefitDeliverySummary(delivery);
  }

  async findAll(
    query: QueryBenefitDeliveriesDto,
  ): Promise<PaginatedResponse<BenefitDeliverySummary>> {
    const normalizedQuery = normalizePaginationQuery(query);
    const skip = (normalizedQuery.page - 1) * normalizedQuery.pageSize;
    const [items, totalItems] = await Promise.all([
      this.repository.findMany(
        normalizedQuery,
        skip,
        normalizedQuery.pageSize,
      ),
      this.repository.count(normalizedQuery),
    ]);

    return createPaginatedResponse(
      items.map(toBenefitDeliverySummary),
      normalizedQuery.page,
      normalizedQuery.pageSize,
      totalItems,
    );
  }

  async findOne(id: string): Promise<BenefitDeliverySummary> {
    const delivery = await this.repository.findById(id);

    if (!delivery) {
      throw new DomainNotFoundException('benefit_delivery', id);
    }

    return toBenefitDeliverySummary(delivery);
  }

  private logAudit(action: string, details: Record<string, unknown>) {
    this.logger.log(
      JSON.stringify({
        type: 'audit',
        action,
        timestamp: new Date().toISOString(),
        ...details,
      }),
    );
  }
}
