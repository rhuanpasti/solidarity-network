import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { sanitizeForAudit } from './log-sanitizer.util';
import { requestContextStorage } from './request-context.service';
import { StructuredLoggerService } from './structured-logger.service';

interface AuditTrailInput {
  action: string;
  status?: 'success' | 'failure';
  entityType?: string;
  entityId?: string;
  charityProgramId?: string | null;
  actor?: Pick<AuthenticatedUser, 'sub' | 'accountType' | 'role'> | null;
  changedFields?: string[];
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
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
    const metadata = sanitizeForAudit(input.metadata) as
      | Prisma.InputJsonValue
      | undefined;
    const previousValues = this.toNullableJson(input.previousValues);
    const newValues = this.toNullableJson(input.newValues);

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
          changedFields: input.changedFields ?? [],
          previousValues,
          newValues,
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
      changedFields: input.changedFields ?? [],
    });
  }

  history(entityType: string, entityId: string, take = 50) {
    return this.prisma.auditTrail.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take,
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

  private toNullableJson(value: Record<string, unknown> | null | undefined) {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return Prisma.JsonNull;
    }

    return sanitizeForAudit(value) as Prisma.InputJsonValue;
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
