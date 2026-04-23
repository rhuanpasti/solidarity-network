import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { sanitizeForLogs } from './log-sanitizer.util';
import { requestContextStorage } from './request-context.service';
import { StructuredLoggerService } from './structured-logger.service';

interface EntityVersionInput {
  entityType: string;
  entityId: string;
  action: string;
  charityProgramId?: string | null;
  actor?: Pick<AuthenticatedUser, 'sub' | 'accountType' | 'role'> | null;
  changedFields?: string[];
  snapshot: Record<string, unknown>;
  diff?: Record<string, unknown>;
}

@Injectable()
export class EntityVersioningService {
  private readonly fallbackLogger = new Logger(EntityVersioningService.name);

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional() private readonly logger?: StructuredLoggerService,
  ) {}

  async recordVersion(input: EntityVersionInput) {
    const actor = input.actor ?? null;
    const context = requestContextStorage.getStore();
    const snapshot = sanitizeForLogs(input.snapshot) as Prisma.InputJsonValue;
    const diff = input.diff
      ? (sanitizeForLogs(input.diff) as Prisma.InputJsonValue)
      : undefined;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(async (transaction) => {
          const latest = await transaction.entityVersion.aggregate({
            where: {
              entityType: input.entityType,
              entityId: input.entityId,
            },
            _max: {
              version: true,
            },
          });

          const version = (latest._max.version ?? 0) + 1;

          return transaction.entityVersion.create({
            data: {
              entityType: input.entityType,
              entityId: input.entityId,
              version,
              action: input.action,
              charityProgramId: input.charityProgramId ?? undefined,
              actorAccountId: actor?.sub ?? context?.accountId,
              actorAccountType: actor?.accountType ?? context?.accountType,
              actorRole: actor?.role ?? context?.role,
              changedFields: input.changedFields ?? [],
              snapshot,
              diff,
            },
          });
        });
      } catch (error) {
        if (this.isUniqueVersionConflict(error) && attempt < 2) {
          continue;
        }

        this.logError(
          'entity_version.persist_failed',
          {
            event: 'entity_version.persist_failed',
            entityType: input.entityType,
            entityId: input.entityId,
            action: input.action,
          },
          error,
        );
        return undefined;
      }
    }

    return undefined;
  }

  history(entityType: string, entityId: string, take = 50) {
    return this.prisma.entityVersion.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: {
        version: 'desc',
      },
      take,
    });
  }

  stateAt(input: {
    entityType: string;
    entityId: string;
    version?: number;
    at?: Date;
  }) {
    return this.prisma.entityVersion.findFirst({
      where: {
        entityType: input.entityType,
        entityId: input.entityId,
        ...(input.version !== undefined
          ? { version: { lte: input.version } }
          : {}),
        ...(input.at ? { createdAt: { lte: input.at } } : {}),
      },
      orderBy: {
        version: 'desc',
      },
    });
  }

  private isUniqueVersionConflict(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
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
