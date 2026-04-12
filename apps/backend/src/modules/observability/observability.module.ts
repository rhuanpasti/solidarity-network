import {
  Global,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditTrailService } from './audit-trail.service';
import { RequestContextService } from './request-context.service';
import { RequestLoggingInterceptor } from './request-logging.interceptor';
import { RequestTracingMiddleware } from './request-tracing.middleware';
import { StructuredLoggerService } from './structured-logger.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    AuditTrailService,
    RequestContextService,
    RequestLoggingInterceptor,
    RequestTracingMiddleware,
    StructuredLoggerService,
  ],
  exports: [
    AuditTrailService,
    RequestContextService,
    RequestLoggingInterceptor,
    StructuredLoggerService,
  ],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestTracingMiddleware).forRoutes('*');
  }
}

