import { Injectable, Logger } from '@nestjs/common';
import { sanitizeForLogs } from './log-sanitizer.util';
import { RequestContextService } from './request-context.service';

type LogLevel = 'log' | 'warn' | 'error' | 'debug';

@Injectable()
export class StructuredLoggerService {
  private readonly logger = new Logger('StructuredLogger');

  constructor(private readonly requestContextService: RequestContextService) {}

  log(message: string, details?: Record<string, unknown>) {
    this.write('log', message, details);
  }

  warn(message: string, details?: Record<string, unknown>) {
    this.write('warn', message, details);
  }

  debug(message: string, details?: Record<string, unknown>) {
    this.write('debug', message, details);
  }

  error(
    message: string,
    details?: Record<string, unknown>,
    error?: unknown,
  ) {
    this.write('error', message, {
      ...details,
      error: this.normalizeError(error),
    });
  }

  private write(level: LogLevel, message: string, details?: Record<string, unknown>) {
    const context = this.requestContextService.get();
    const payload = sanitizeForLogs({
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'solidarity-network-backend',
      requestId: context?.requestId,
      traceId: context?.requestId,
      method: context?.method,
      path: context?.path,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      accountId: context?.accountId,
      accountType: context?.accountType,
      role: context?.role,
      ...details,
    });

    this.logger[level](JSON.stringify(payload));
  }

  private normalizeError(error: unknown) {
    if (!(error instanceof Error)) {
      return error;
    }

    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
}

