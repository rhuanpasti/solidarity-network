import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
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
  constructor(private readonly logger: StructuredLoggerService) {}

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
      this.logger.error(
        'request.exception',
        {
          event: 'request.exception',
          statusCode: status,
          path: request.url,
        },
        exception,
      );
    } else {
      this.logger.warn('request.exception', {
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
}
