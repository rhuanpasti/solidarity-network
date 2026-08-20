import { ForbiddenException, Inject, Injectable, Optional } from '@nestjs/common';
import type { Administrator, CharityProgram } from '@prisma/client';
import { createHash } from 'node:crypto';
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
import { AuditTrailService } from '../observability/audit-trail.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { CharityProgramsRepository } from '../charity-programs/charity-programs.repository';
import { EmailService } from '../email/email.service';
import {
  generateNumericPasskey,
  hashPassword,
} from '../auth/password.util';
import type { AuthenticatedUser } from '../auth/auth.types';
import { toAdministratorSummary } from './administrators.mapper';
import { AdministratorsRepository } from './administrators.repository';
import { CreateAdministratorDto } from './dto/create-administrator.dto';
import { UpdateAdministratorDto } from './dto/update-administrator.dto';
import { DemoDataService } from '../demo/demo-data.service';

@Injectable()
export class AdministratorsService {
  constructor(
    @Inject(AuditTrailService)
    private readonly auditTrailService: AuditTrailService,
    @Inject(AuthorizationService)
    private readonly authorizationService: AuthorizationService,
    @Inject(AdministratorsRepository)
    private readonly repository: AdministratorsRepository,
    @Inject(CharityProgramsRepository)
    private readonly charityProgramsRepository: CharityProgramsRepository,
    @Inject(EmailService)
    private readonly emailService: EmailService,
    @Optional()
    @Inject(DemoDataService)
    private readonly demoDataService?: DemoDataService,
  ) {}

  async create(
    dto: CreateAdministratorDto,
    actor: AuthenticatedUser,
  ): Promise<CreateAdministratorResult> {
    this.authorizationService.assertCanManageAdministrator(actor, {
      action: 'administrator.create',
    });
    if (this.demoDataService?.isDemoUser(actor)) {
      return this.demoDataService.previewAdministrator({
        ...dto,
        charityProgramIds: dto.charityProgramIds ?? [],
      });
    }
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

    await this.auditTrailService.record({
      action: 'administrator.create',
      entityType: 'administrator',
      entityId: administrator.id,
      actor,
      metadata: {
        assignedProgramIds: dto.charityProgramIds ?? [],
        role: administrator.role,
      },
    });

    await this.sendTemporaryPasswordEmail({
      email: administrator.email,
      name: administrator.name,
      temporaryPassword: generatedPasskey,
    });

    return {
      administrator: toAdministratorSummary(administrator),
      generatedPasskey,
    };
  }

  async findAll(
    query: PaginationQueryDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedResponse<AdministratorSummary>> {
    if (this.demoDataService?.isDemoUser(actor)) {
      return this.demoDataService.listAdministrators(query);
    }
    const normalizedQuery = normalizePaginationQuery(query);
    const skip = (normalizedQuery.page - 1) * normalizedQuery.pageSize;
    const scope = this.authorizationService.getProgramScope(actor);
    const [items, totalItems] = await Promise.all([
      this.repository.findMany(
        skip,
        normalizedQuery.pageSize,
        normalizedQuery.search,
        scope,
      ),
      this.repository.count(normalizedQuery.search, scope),
    ]);

    return createPaginatedResponse(
      items.map(toAdministratorSummary),
      normalizedQuery.page,
      normalizedQuery.pageSize,
      totalItems,
    );
  }

  async findOne(id: string, actor: AuthenticatedUser): Promise<AdministratorSummary> {
    if (this.demoDataService?.isDemoUser(actor)) {
      return this.demoDataService.getAdministrator(id);
    }
    const administrator = await this.findVisibleAdministrator(id, actor);

    if (!administrator) {
      throw new DomainNotFoundException('administrator', id);
    }

    return toAdministratorSummary(administrator);
  }

  async resendTemporaryPassword(id: string, actor: AuthenticatedUser) {
    this.authorizationService.assertCanManageAdministrator(actor, {
      action: 'administrator.temporary_password.resend',
      targetAdministratorId: id,
    });

    if (this.demoDataService?.isDemoUser(actor)) {
      return { success: false };
    }

    const administrator = await this.findVisibleAdministrator(id, actor);

    if (!administrator) {
      throw new DomainNotFoundException('administrator', id);
    }

    const temporaryPassword = generateNumericPasskey(16);

    await this.repository.updateCredential(id, {
      passwordHash: await hashPassword(temporaryPassword),
      mustChangePassword: true,
      lastPasswordChangedAt: null,
    });

    const emailSent = await this.sendTemporaryPasswordEmail({
      email: administrator.email,
      name: administrator.name,
      temporaryPassword,
    });

    if (emailSent) {
      await this.auditTrailService.record({
        action: 'administrator.temporary_password.resent',
        entityType: 'administrator',
        entityId: administrator.id,
        actor,
        metadata: {
          emailFingerprint: this.buildEmailFingerprint(administrator.email),
        },
      });
    }

    return { success: emailSent };
  }

  async update(
    id: string,
    dto: UpdateAdministratorDto,
    actor: AuthenticatedUser,
  ): Promise<AdministratorSummary> {
    this.authorizationService.assertCanManageAdministrator(actor, {
      action: 'administrator.update',
      targetAdministratorId: id,
    });

    const demoDataService = this.demoDataService;
    if (demoDataService?.isDemoUser(actor)) {
      const existing = demoDataService.getAdministrator(id);
      return {
        ...existing,
        name: dto.name ?? existing.name,
        email: dto.email ?? existing.email,
        phone: dto.phone ?? existing.phone,
        role: dto.role ?? existing.role,
        charityPrograms: dto.charityProgramIds
          ? dto.charityProgramIds.map((programId) => demoDataService.getProgram(programId))
          : existing.charityPrograms,
      };
    }

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

    await this.auditTrailService.record({
      action: 'administrator.update',
      entityType: 'administrator',
      entityId: updatedAdministrator.id,
      actor,
      metadata: {
        roleChanged: dto.role !== undefined,
        assignedProgramIds: dto.charityProgramIds ?? undefined,
        nextRole: dto.role,
      },
    });

    return toAdministratorSummary(updatedAdministrator);
  }

  private async findVisibleAdministrator(id: string, actor: AuthenticatedUser) {
    const administrator = await this.repository.findById(
      id,
      this.authorizationService.getProgramScope(actor),
    );

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

    void this.auditTrailService.record({
      action: 'administrator.role_change.denied',
      status: 'failure',
      entityType: 'administrator',
      entityId: administrator.id,
      actor,
      metadata: {
        attemptedRole: dto.role,
      },
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

  private async sendTemporaryPasswordEmail(payload: {
    email: string;
    name: string;
    temporaryPassword: string;
  }): Promise<boolean> {
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
      return true;
    } catch {
      await this.auditTrailService.record({
        action: 'administrator.temporary_password_email.failed',
        status: 'failure',
        metadata: {
          emailFingerprint: this.buildEmailFingerprint(payload.email),
        },
      });
      return false;
    }
  }

  private buildEmailFingerprint(email: string) {
    return createHash('sha256')
      .update(email.trim().toLowerCase())
      .digest('hex')
      .slice(0, 16);
  }
}
