import { Inject, Injectable, Optional } from '@nestjs/common';
import type { BenefitSummary, PaginatedResponse } from '@solidarity-network/shared';
import {
  normalizePaginationQuery,
  PaginationQueryDto,
} from '../../common/dto/pagination-query.dto';
import { createPaginatedResponse } from '../../common/dto/pagination-response';
import { DomainNotFoundException } from '../../common/exceptions/domain-not-found.exception';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditTrailService } from '../observability/audit-trail.service';
import { EntityVersioningService } from '../observability/entity-versioning.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { toBenefitSummary } from './benefits.mapper';
import { BenefitsRepository } from './benefits.repository';
import { CreateBenefitDto } from './dto/create-benefit.dto';
import { UpdateBenefitDto } from './dto/update-benefit.dto';
import { UpdateBenefitStatusDto } from './dto/update-benefit-status.dto';
import { DemoDataService } from '../demo/demo-data.service';

@Injectable()
export class BenefitsService {
  constructor(
    @Inject(AuditTrailService)
    private readonly auditTrailService: AuditTrailService,
    @Inject(EntityVersioningService)
    private readonly entityVersioningService: EntityVersioningService,
    @Inject(AuthorizationService)
    private readonly authorizationService: AuthorizationService,
    @Inject(BenefitsRepository)
    private readonly repository: BenefitsRepository,
    @Optional()
    @Inject(DemoDataService)
    private readonly demoDataService?: DemoDataService,
  ) {}

  async create(
    dto: CreateBenefitDto,
    actor: AuthenticatedUser,
  ): Promise<BenefitSummary> {
    this.authorizationService.assertCanManageBenefit(actor, {
      action: 'benefit.create',
    });
    if (this.demoDataService?.isDemoUser(actor)) {
      return this.demoDataService.previewBenefit({
        name: dto.name,
        description: dto.description,
        category: dto.category,
        active: dto.active ?? true,
      });
    }
    const benefit = await this.repository.create({
      ...dto,
      active: dto.active ?? true,
    });
    const newSnapshot = this.toAuditSnapshot(benefit);
    await this.auditTrailService.record({
      action: 'benefit.create',
      entityType: 'benefit',
      entityId: benefit.id,
      actor,
      changedFields: Object.keys(newSnapshot),
      previousValues: null,
      newValues: newSnapshot,
    });
    await this.entityVersioningService.recordVersion({
      entityType: 'benefit',
      entityId: benefit.id,
      action: 'benefit.create',
      actor,
      changedFields: Object.keys(newSnapshot),
      snapshot: newSnapshot,
      diff: {
        previousValues: null,
        newValues: newSnapshot,
      },
    });
    return toBenefitSummary(benefit);
  }

  async findAll(
    query: PaginationQueryDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedResponse<BenefitSummary>> {
    if (this.demoDataService?.isDemoUser(actor)) {
      return this.demoDataService.listBenefits(query);
    }
    this.authorizationService.assertCanManageBenefit(actor, {
      action: 'benefit.find_all',
    });
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

  async findOne(id: string, actor: AuthenticatedUser): Promise<BenefitSummary> {
    if (this.demoDataService?.isDemoUser(actor)) {
      return this.demoDataService.getBenefit(id);
    }
    this.authorizationService.assertCanManageBenefit(actor, {
      action: 'benefit.find_one',
      benefitId: id,
    });
    const benefit = await this.repository.findById(id);

    if (!benefit) {
      throw new DomainNotFoundException('benefit', id);
    }

    return toBenefitSummary(benefit);
  }

  async update(
    id: string,
    dto: UpdateBenefitDto,
    actor: AuthenticatedUser,
  ): Promise<BenefitSummary> {
    if (this.demoDataService?.isDemoUser(actor)) {
      return this.demoDataService.getBenefit(id);
    }
    this.authorizationService.assertCanManageBenefit(actor, {
      action: 'benefit.update',
      benefitId: id,
    });
    const existingBenefit = await this.findExistingBenefit(id);
    const previousSnapshot = this.toAuditSnapshot(existingBenefit);
    const benefit = await this.repository.update(id, dto);
    const newSnapshot = this.toAuditSnapshot(benefit);
    const auditChanges = this.getAuditChanges(previousSnapshot, newSnapshot);
    await this.auditTrailService.record({
      action: 'benefit.update',
      entityType: 'benefit',
      entityId: benefit.id,
      actor,
      changedFields: auditChanges.changedFields,
      previousValues: auditChanges.previousValues,
      newValues: auditChanges.newValues,
    });
    await this.entityVersioningService.recordVersion({
      entityType: 'benefit',
      entityId: benefit.id,
      action: 'benefit.update',
      actor,
      changedFields: auditChanges.changedFields,
      snapshot: newSnapshot,
      diff: auditChanges,
    });
    return toBenefitSummary(benefit);
  }

  async updateStatus(
    id: string,
    dto: UpdateBenefitStatusDto,
    actor: AuthenticatedUser,
  ): Promise<BenefitSummary> {
    if (this.demoDataService?.isDemoUser(actor)) {
      return this.demoDataService.getBenefit(id);
    }
    this.authorizationService.assertCanManageBenefit(actor, {
      action: 'benefit.update_status',
      benefitId: id,
    });
    const existingBenefit = await this.findExistingBenefit(id);
    const previousSnapshot = this.toAuditSnapshot(existingBenefit);
    const benefit = await this.repository.update(id, { active: dto.active });
    const newSnapshot = this.toAuditSnapshot(benefit);
    const auditChanges = this.getAuditChanges(previousSnapshot, newSnapshot);
    await this.auditTrailService.record({
      action: 'benefit.update_status',
      entityType: 'benefit',
      entityId: benefit.id,
      actor,
      changedFields: auditChanges.changedFields,
      previousValues: auditChanges.previousValues,
      newValues: auditChanges.newValues,
    });
    await this.entityVersioningService.recordVersion({
      entityType: 'benefit',
      entityId: benefit.id,
      action: 'benefit.update_status',
      actor,
      changedFields: auditChanges.changedFields,
      snapshot: newSnapshot,
      diff: auditChanges,
    });
    return toBenefitSummary(benefit);
  }

  private async findExistingBenefit(id: string) {
    const benefit = await this.repository.findById(id);

    if (!benefit) {
      throw new DomainNotFoundException('benefit', id);
    }

    return benefit;
  }

  private toAuditSnapshot(benefit: {
    name: string;
    description: string;
    category: string;
    active: boolean;
  }) {
    return {
      name: benefit.name,
      description: benefit.description,
      category: benefit.category,
      active: benefit.active,
    };
  }

  private getAuditChanges(
    previousSnapshot: Record<string, unknown>,
    newSnapshot: Record<string, unknown>,
  ) {
    const changedFields = Object.keys(newSnapshot).filter(
      (key) => previousSnapshot[key] !== newSnapshot[key],
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
}
