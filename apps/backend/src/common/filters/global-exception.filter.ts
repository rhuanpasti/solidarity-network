import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

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
export class GlobalExceptionFilter implements ExceptionFilter {
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

    if (!isHttpExceptionLike(exception)) {
      console.error('Unhandled exception', exception);
    }

    response.status(status).json({
      statusCode: status,
      code: String(payload.code ?? 'HTTP_ERROR'),
      message: String(payload.message ?? 'Request failed.'),
      details: payload.details ?? payload.errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
