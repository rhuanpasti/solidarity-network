import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import type { Administrator, CharityProgram } from '@prisma/client';
import type {
  AdministratorSummary,
  CreateAdministratorResult,
  PaginatedResponse,
} from '@solidarity-network/shared';
import { createPaginatedResponse } from '../../common/dto/pagination-response';
import {
  normalizePaginationQuery,
  PaginationQueryDto,
} from '../../common/dto/pagination-query.dto';
import { DomainNotFoundException } from '../../common/exceptions/domain-not-found.exception';
import { CharityProgramsRepository } from '../charity-programs/charity-programs.repository';
import {
  generateNumericPasskey,
  hashPassword,
} from '../auth/password.util';
import type { AuthenticatedUser } from '../auth/auth.types';
import { toAdministratorSummary } from './administrators.mapper';
import { AdministratorsRepository } from './administrators.repository';
import { CreateAdministratorDto } from './dto/create-administrator.dto';
import { UpdateAdministratorDto } from './dto/update-administrator.dto';

@Injectable()
export class AdministratorsService {
  private readonly logger = new Logger(AdministratorsService.name);

  constructor(
    @Inject(AdministratorsRepository)
    private readonly repository: AdministratorsRepository,
    @Inject(CharityProgramsRepository)
    private readonly charityProgramsRepository: CharityProgramsRepository,
  ) {}

  async create(
    dto: CreateAdministratorDto,
    actor: AuthenticatedUser,
  ): Promise<CreateAdministratorResult> {
    await this.assertProgramsExist(dto.charityProgramIds);
    const generatedPasskey = generateNumericPasskey(16);

    const administrator = await this.repository.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      role: dto.role,
      credential: {
        create: {
          username: dto.email.trim().toLowerCase(),
          passwordHash: await hashPassword(generatedPasskey),
          mustChangePassword: true,
        },
      },
      charityPrograms: dto.charityProgramIds?.length
        ? {
            create: dto.charityProgramIds.map((charityProgramId) => ({
              charityProgram: {
                connect: { id: charityProgramId },
              },
            })),
          }
        : undefined,
    });

    this.logAudit('administrator.create', {
      actorAccountId: actor.sub,
      targetAdministratorId: administrator.id,
      assignedProgramIds: dto.charityProgramIds ?? [],
      role: administrator.role,
    });

    return {
      administrator: toAdministratorSummary(administrator),
      generatedPasskey,
    };
  }

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<AdministratorSummary>> {
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
      items.map(toAdministratorSummary),
      normalizedQuery.page,
      normalizedQuery.pageSize,
      totalItems,
    );
  }

  async findOne(id: string): Promise<AdministratorSummary> {
    const administrator = await this.findVisibleAdministrator(id);

    if (!administrator) {
      throw new DomainNotFoundException('administrator', id);
    }

    return toAdministratorSummary(administrator);
  }

  async update(
    id: string,
    dto: UpdateAdministratorDto,
    actor: AuthenticatedUser,
  ): Promise<AdministratorSummary> {
    const administrator = await this.repository.findById(id);

    if (!administrator) {
      throw new DomainNotFoundException('administrator', id);
    }

    this.assertMutableAdministrator(administrator);
    this.assertRoleUpdateAllowed(administrator, dto, actor);
    await this.assertProgramsExist(dto.charityProgramIds);

    const updatedAdministrator = await this.repository.update(
      id,
      {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        role: dto.role,
      },
      dto.charityProgramIds,
    );

    this.logAudit('administrator.update', {
      actorAccountId: actor.sub,
      targetAdministratorId: updatedAdministrator.id,
      roleChanged: dto.role !== undefined,
      assignedProgramIds: dto.charityProgramIds ?? undefined,
    });

    return toAdministratorSummary(updatedAdministrator);
  }

  private async findVisibleAdministrator(id: string) {
    const administrator = await this.repository.findById(id);

    if (!administrator || administrator.isSystemRoot) {
      return null;
    }

    return administrator;
  }

  private assertMutableAdministrator(administrator: Administrator) {
    if (!administrator.isSystemRoot) {
      return;
    }

    throw new ForbiddenException({
      code: 'ROOT_ADMIN_IMMUTABLE',
      message: 'The root administrator cannot be modified.',
    });
  }

  private assertRoleUpdateAllowed(
    administrator: Administrator,
    dto: UpdateAdministratorDto,
    actor: AuthenticatedUser,
  ) {
    if (dto.role === undefined) {
      return;
    }

    if (actor.role === 'super_admin') {
      return;
    }

    this.logAudit('administrator.role_change.denied', {
      actorAccountId: actor.sub,
      targetAdministratorId: administrator.id,
      attemptedRole: dto.role,
    });

    throw new ForbiddenException({
      code: 'ADMINISTRATOR_ROLE_CHANGE_FORBIDDEN',
      message: 'Only super admins can change administrator roles.',
    });
  }

  private async assertProgramsExist(charityProgramIds?: string[]) {
    if (!charityProgramIds?.length) {
      return;
    }

    const programs = await Promise.all(
      charityProgramIds.map((programId) =>
        this.charityProgramsRepository.findById(programId),
      ),
    );

    const missingProgramId = programs.findIndex(
      (program: CharityProgram | null) => !program,
    );
    if (missingProgramId >= 0) {
      throw new DomainNotFoundException(
        'charity_program',
        charityProgramIds[missingProgramId]!,
      );
    }
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
