import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { sanitizeForLogs } from './log-sanitizer.util';
import { RequestContextService } from './request-context.service';
import { StructuredLoggerService } from './structured-logger.service';

interface AuditTrailInput {
  action: string;
  status?: 'success' | 'failure';
  entityType?: string;
  entityId?: string;
  charityProgramId?: string | null;
  actor?: Pick<AuthenticatedUser, 'sub' | 'accountType' | 'role'> | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditTrailService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLoggerService,
    private readonly requestContextService: RequestContextService,
  ) {}

  async record(input: AuditTrailInput) {
    const context = this.requestContextService.get();
    const actor = input.actor ?? null;
    const metadata = sanitizeForLogs(input.metadata) as
      | Prisma.InputJsonValue
      | undefined;

    try {
      await this.prisma.auditTrail.create({
        data: {
          action: input.action,
          status: input.status ?? 'success',
          entityType: input.entityType,
          entityId: input.entityId,
          charityProgramId: input.charityProgramId ?? undefined,
          actorAccountId: actor?.sub ?? context?.accountId,
          actorAccountType: actor?.accountType ?? context?.accountType,
          actorRole: actor?.role ?? context?.role,
          requestId: context?.requestId,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
          metadata,
        },
      });
    } catch (error) {
      this.logger.error(
        'audit.persist_failed',
        {
          event: 'audit.persist_failed',
          action: input.action,
        },
        error,
      );
      return;
    }

    this.logger.log('audit.recorded', {
      event: 'audit.recorded',
      action: input.action,
      status: input.status ?? 'success',
      entityType: input.entityType,
      entityId: input.entityId,
      charityProgramId: input.charityProgramId,
    });
  }
}

