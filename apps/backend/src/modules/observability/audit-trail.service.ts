import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { sanitizeForLogs } from './log-sanitizer.util';
import { requestContextStorage } from './request-context.service';
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
  private readonly fallbackLogger = new Logger(AuditTrailService.name);
  private isPersistenceUnavailable = false;

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional() private readonly logger?: StructuredLoggerService,
  ) {}

  async record(input: AuditTrailInput) {
    if (this.isPersistenceUnavailable) {
      return;
    }

    const context = requestContextStorage.getStore();
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
      if (this.isMissingAuditTrailTable(error)) {
        this.isPersistenceUnavailable = true;
        this.logError(
          'audit.persistence_unavailable',
          {
            event: 'audit.persistence_unavailable',
            action: input.action,
            reason: 'audit_trail_table_missing',
          },
          error,
        );
        return;
      }

      this.logError(
        'audit.persist_failed',
        {
          event: 'audit.persist_failed',
          action: input.action,
        },
        error,
      );
      return;
    }

    this.logInfo('audit.recorded', {
      event: 'audit.recorded',
      action: input.action,
      status: input.status ?? 'success',
      entityType: input.entityType,
      entityId: input.entityId,
      charityProgramId: input.charityProgramId,
    });
  }

  private isMissingAuditTrailTable(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2021'
    );
  }

  private logInfo(message: string, details: Record<string, unknown>) {
    if (this.logger) {
      this.logger.log(message, details);
      return;
    }

    this.fallbackLogger.log(JSON.stringify(details));
  }

  private logError(
    message: string,
    details: Record<string, unknown>,
    error: unknown,
  ) {
    if (this.logger) {
      this.logger.error(message, details, error);
      return;
    }

    this.fallbackLogger.error(
      JSON.stringify({
        ...details,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : error,
      }),
    );
  }
}
