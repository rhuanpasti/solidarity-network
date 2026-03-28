import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload =
      exception instanceof HttpException
        ? (exception.getResponse() as Record<string, unknown>)
        : {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred.',
          };

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

