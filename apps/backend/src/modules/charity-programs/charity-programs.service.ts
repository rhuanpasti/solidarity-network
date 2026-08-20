import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  CharityProgramSummary,
  PaginatedResponse,
} from '@solidarity-network/shared';
import { createPaginatedResponse } from '../../common/dto/pagination-response';
import { normalizePaginationQuery } from '../../common/dto/pagination-query.dto';
import { QueryCharityProgramsDto } from './dto/query-charity-programs.dto';
import { DomainNotFoundException } from '../../common/exceptions/domain-not-found.exception';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthorizationService } from '../authorization/authorization.service';
import { CreateCharityProgramDto } from './dto/create-charity-program.dto';
import { UpdateCharityProgramDto } from './dto/update-charity-program.dto';
import { UpdateCharityProgramStatusDto } from './dto/update-charity-program-status.dto';
import { toCharityProgramSummary } from './charity-programs.mapper';
import { CharityProgramsRepository } from './charity-programs.repository';
import { DemoDataService } from '../demo/demo-data.service';

@Injectable()
export class CharityProgramsService {
  constructor(
    @Inject(AuthorizationService)
    private readonly authorizationService: AuthorizationService,
    @Inject(CharityProgramsRepository)
    private readonly repository: CharityProgramsRepository,
    @Optional()
    @Inject(DemoDataService)
    private readonly demoDataService?: DemoDataService,
  ) {}

  async create(
    dto: CreateCharityProgramDto,
    actor: AuthenticatedUser,
  ): Promise<CharityProgramSummary> {
    this.authorizationService.assertCanCreateCharityProgram(actor, {
      action: 'charity_program.create',
    });
    if (this.demoDataService?.isDemoUser(actor)) {
      return this.demoDataService.previewProgram({
        name: dto.name,
        description: dto.description,
        status: dto.status ?? 'active',
      });
    }
    const program = await this.repository.create({
      ...dto,
      status: dto.status ?? 'active',
    });

    return toCharityProgramSummary(program);
  }

  async findAll(
    query: QueryCharityProgramsDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedResponse<CharityProgramSummary>> {
    if (this.demoDataService?.isDemoUser(actor)) {
      return this.demoDataService.listPrograms(query);
    }
    const normalizedQuery = normalizePaginationQuery(query);
    const skip = (normalizedQuery.page - 1) * normalizedQuery.pageSize;
    const scope = this.authorizationService.getProgramScope(actor);
    const [items, totalItems] = await Promise.all([
      this.repository.findMany(
        skip,
        normalizedQuery.pageSize,
        normalizedQuery.search,
        normalizedQuery.status,
        scope,
      ),
      this.repository.count(normalizedQuery.search, normalizedQuery.status, scope),
    ]);

    return createPaginatedResponse(
      items.map(toCharityProgramSummary),
      normalizedQuery.page,
      normalizedQuery.pageSize,
      totalItems,
    );
  }

  async findOne(id: string, actor: AuthenticatedUser): Promise<CharityProgramSummary> {
    if (this.demoDataService?.isDemoUser(actor)) {
      return this.demoDataService.getProgram(id);
    }
    const program = await this.repository.findById(
      id,
      this.authorizationService.getProgramScope(actor),
    );

    if (!program) {
      throw new DomainNotFoundException('charity_program', id);
    }

    return toCharityProgramSummary(program);
  }

  async update(
    id: string,
    dto: UpdateCharityProgramDto,
    actor: AuthenticatedUser,
  ): Promise<CharityProgramSummary> {
    if (this.demoDataService?.isDemoUser(actor)) {
      const existing = this.demoDataService.getProgram(id);
      return this.demoDataService.previewProgram({
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        status: dto.status ?? existing.status,
      });
    }
    await this.findOne(id, actor);
    const program = await this.repository.update(id, dto);
    return toCharityProgramSummary(program);
  }

  async updateStatus(
    id: string,
    dto: UpdateCharityProgramStatusDto,
    actor: AuthenticatedUser,
  ): Promise<CharityProgramSummary> {
    if (this.demoDataService?.isDemoUser(actor)) {
      const existing = this.demoDataService.getProgram(id);
      return this.demoDataService.previewProgram({
        name: existing.name,
        description: existing.description,
        status: dto.status,
      });
    }
    await this.findOne(id, actor);
    const program = await this.repository.update(id, { status: dto.status });
    return toCharityProgramSummary(program);
  }
}
