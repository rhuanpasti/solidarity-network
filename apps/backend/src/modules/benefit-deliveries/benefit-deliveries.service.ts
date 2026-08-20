import { BadRequestException, Inject, Injectable, Optional } from '@nestjs/common';
import type { AdministratorProgramLink } from '@prisma/client';
import { createHash } from 'node:crypto';
import type {
  BenefitDeliverySummary,
  PaginatedResponse,
} from '@solidarity-network/shared';
import { DomainNotFoundException } from '../../common/exceptions/domain-not-found.exception';
import { normalizePaginationQuery } from '../../common/dto/pagination-query.dto';
import { createPaginatedResponse } from '../../common/dto/pagination-response';
import { AdministratorsRepository } from '../administrators/administrators.repository';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditTrailService } from '../observability/audit-trail.service';
import { EntityVersioningService } from '../observability/entity-versioning.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { BeneficiariesRepository } from '../beneficiaries/beneficiaries.repository';
import { BenefitsRepository } from '../benefits/benefits.repository';
import { CharityProgramsRepository } from '../charity-programs/charity-programs.repository';
import { EmailService } from '../email/email.service';
import { BenefitDeliveriesRepository } from './benefit-deliveries.repository';
import { toBenefitDeliverySummary } from './benefit-deliveries.mapper';
import { CreateBenefitDeliveryDto } from './dto/create-benefit-delivery.dto';
import { QueryBenefitDeliveriesDto } from './dto/query-benefit-deliveries.dto';
import { DemoDataService } from '../demo/demo-data.service';

@Injectable()
export class BenefitDeliveriesService {
  constructor(
    @Inject(AuditTrailService)
    private readonly auditTrailService: AuditTrailService,
    @Inject(EntityVersioningService)
    private readonly entityVersioningService: EntityVersioningService,
    @Inject(AuthorizationService)
    private readonly authorizationService: AuthorizationService,
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
    @Inject(EmailService)
    private readonly emailService: EmailService,
    @Optional()
    @Inject(DemoDataService)
    private readonly demoDataService?: DemoDataService,
  ) {}

  async create(
    dto: CreateBenefitDeliveryDto,
    actor: AuthenticatedUser,
  ): Promise<BenefitDeliverySummary> {
    this.authorizationService.assertCanRegisterDelivery(actor, dto.charityProgramId, {
      action: 'benefit_delivery.create',
    });
    if (this.demoDataService?.isDemoUser(actor)) {
      return this.demoDataService.previewDelivery(dto);
    }

    const [beneficiary, benefit, charityProgram, administrator] = await Promise.all([
      this.beneficiariesRepository.findById(dto.beneficiaryId),
      this.benefitsRepository.findById(dto.benefitId),
      this.charityProgramsRepository.findById(dto.charityProgramId),
      this.administratorsRepository.findAnyById(actor.sub),
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
      throw new DomainNotFoundException('administrator', actor.sub);
    }
    if (!benefit.active) {
      throw new BadRequestException({
        code: 'BENEFIT_INACTIVE',
        message: 'Cannot register a delivery for an inactive benefit.',
      });
    }
    if (
      !beneficiary.charityPrograms.some(
        (link) => link.charityProgramId === dto.charityProgramId,
      )
    ) {
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
      administratorId: actor.sub,
      reference: dto.reference,
    });

    const newSnapshot = this.toAuditSnapshot(delivery);

    await this.auditTrailService.record({
      action: 'benefit_delivery.create',
      entityType: 'benefit_delivery',
      entityId: delivery.id,
      charityProgramId: dto.charityProgramId,
      actor,
      changedFields: Object.keys(newSnapshot),
      previousValues: null,
      newValues: newSnapshot,
      metadata: {
        beneficiaryId: dto.beneficiaryId,
        benefitId: dto.benefitId,
        quantity: dto.quantity,
        reference: dto.reference,
      },
    });
    await this.entityVersioningService.recordVersion({
      entityType: 'benefit_delivery',
      entityId: delivery.id,
      action: 'benefit_delivery.create',
      charityProgramId: dto.charityProgramId,
      actor,
      changedFields: Object.keys(newSnapshot),
      snapshot: newSnapshot,
      diff: {
        previousValues: null,
        newValues: newSnapshot,
      },
    });

    await this.sendNewDeliveryEmail(delivery);

    return toBenefitDeliverySummary(delivery);
  }

  async findAll(
    query: QueryBenefitDeliveriesDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedResponse<BenefitDeliverySummary>> {
    if (this.demoDataService?.isDemoUser(actor)) {
      return this.demoDataService.listDeliveries(query);
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
      items.map(toBenefitDeliverySummary),
      normalizedQuery.page,
      normalizedQuery.pageSize,
      totalItems,
    );
  }

  async findOne(id: string, actor: AuthenticatedUser): Promise<BenefitDeliverySummary> {
    if (this.demoDataService?.isDemoUser(actor)) {
      return this.demoDataService.getDelivery(id);
    }
    const delivery = await this.repository.findById(
      id,
      this.authorizationService.getProgramScope(actor),
    );

    if (!delivery) {
      throw new DomainNotFoundException('benefit_delivery', id);
    }

    return toBenefitDeliverySummary(delivery);
  }

  private toAuditSnapshot(delivery: {
    beneficiaryId: string;
    benefitId: string;
    charityProgramId: string;
    quantity: number;
    deliveryDate: Date;
    notes: string | null;
    administratorId: string;
    reference: string;
  }) {
    return {
      beneficiaryId: delivery.beneficiaryId,
      benefitId: delivery.benefitId,
      charityProgramId: delivery.charityProgramId,
      quantity: delivery.quantity,
      deliveryDate: delivery.deliveryDate.toISOString(),
      notes: delivery.notes,
      administratorId: delivery.administratorId,
      reference: delivery.reference,
    };
  }

  private async sendNewDeliveryEmail(delivery: {
    beneficiary: { email?: string | null; fullName: string };
    benefit: { name: string; category: string };
    charityProgram: { name: string };
    deliveryDate: Date;
  }) {
    if (!delivery.beneficiary.email) {
      return;
    }

    try {
      await this.emailService.send({
        to: {
          email: delivery.beneficiary.email,
          name: delivery.beneficiary.fullName,
        },
        template: 'new-delivery-notification',
        variables: {
          userName: delivery.beneficiary.fullName,
          deliveryTitle: delivery.benefit.name,
          deliveryType: delivery.benefit.category,
          deliveryDate: delivery.deliveryDate.toISOString(),
          programName: delivery.charityProgram.name,
          organizationName: 'Solidarity Network',
        },
      });
    } catch {
      await this.auditTrailService.record({
        action: 'benefit_delivery.notification_email.failed',
        status: 'failure',
        metadata: {
          beneficiaryEmailFingerprint: this.buildEmailFingerprint(
            delivery.beneficiary.email,
          ),
          benefitName: delivery.benefit.name,
          programName: delivery.charityProgram.name,
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
