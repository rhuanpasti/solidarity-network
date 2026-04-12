import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { tap } from 'rxjs';
import { StructuredLoggerService } from './structured-logger.service';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: StructuredLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request & { authUser?: { sub?: string } }>();
    const response = http.getResponse<{ statusCode: number }>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log('request.completed', {
            event: 'request.completed',
            statusCode: response.statusCode,
            durationMs: Date.now() - startedAt,
            route: request.url,
          });
        },
        error: (error: unknown) => {
          this.logger.warn('request.failed', {
            event: 'request.failed',
            statusCode: response.statusCode,
            durationMs: Date.now() - startedAt,
            route: request.url,
            error:
              error instanceof Error
                ? { name: error.name, message: error.message }
                : undefined,
          });
        },
      }),
    );
  }
}
