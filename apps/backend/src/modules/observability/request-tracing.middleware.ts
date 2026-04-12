import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { RequestContextService } from './request-context.service';

@Injectable()
export class RequestTracingMiddleware implements NestMiddleware {
  constructor(private readonly requestContextService: RequestContextService) {}

  use(request: Request, response: Response, next: NextFunction) {
    const requestIdHeader = request.headers['x-request-id'];
    const requestId =
      (typeof requestIdHeader === 'string' && requestIdHeader.trim()) ||
      randomUUID();

    response.setHeader('X-Request-Id', requestId);

    this.requestContextService.run(
      {
        requestId,
        method: request.method,
        path: request.originalUrl || request.url,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        startedAt: Date.now(),
      },
      next,
    );
  }
}

