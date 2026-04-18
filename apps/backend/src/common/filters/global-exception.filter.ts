import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { StructuredLoggerService } from '../../modules/observability/structured-logger.service';

function isHttpExceptionLike(
  exception: unknown,
): exception is HttpException & {
  getStatus(): number;
  getResponse(): unknown;
} {
  return (
    typeof exception === 'object' &&
    exception !== null &&
    'getStatus' in exception &&
    typeof exception.getStatus === 'function' &&
    'getResponse' in exception &&
    typeof exception.getResponse === 'function'
  );
}

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly fallbackLogger = new Logger(GlobalExceptionFilter.name);

  constructor(
    @Optional() private readonly logger?: StructuredLoggerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const status = isHttpExceptionLike(exception)
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawPayload = isHttpExceptionLike(exception)
      ? exception.getResponse()
      : null;
    const payload =
      rawPayload && typeof rawPayload === 'object'
        ? (rawPayload as Record<string, unknown>)
        : {
            code:
              status === HttpStatus.INTERNAL_SERVER_ERROR
                ? 'INTERNAL_SERVER_ERROR'
                : 'HTTP_ERROR',
            message:
              typeof rawPayload === 'string'
                ? rawPayload
                : 'An unexpected error occurred.',
          };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logError(
        'request.exception',
        {
          event: 'request.exception',
          statusCode: status,
          path: request.url,
        },
        exception,
      );
    } else {
      this.logWarn('request.exception', {
        event: 'request.exception',
        statusCode: status,
        path: request.url,
        code: String(payload.code ?? 'HTTP_ERROR'),
        message: String(payload.message ?? 'Request failed.'),
      });
    }

    response.status(status).json({
      statusCode: status,
      code: String(payload.code ?? 'HTTP_ERROR'),
      message: String(payload.message ?? 'Request failed.'),
      details: payload.details ?? payload.errors,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: response.getHeader('X-Request-Id'),
    });
  }

  private logWarn(message: string, details: Record<string, unknown>) {
    if (this.logger) {
      this.logger.warn(message, details);
      return;
    }

    this.fallbackLogger.warn(JSON.stringify(details));
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
