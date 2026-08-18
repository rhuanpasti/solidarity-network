import {
  Global,
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditTrailService } from './audit-trail.service';
import { EntityVersioningService } from './entity-versioning.service';
import { RequestContextService } from './request-context.service';
import { RequestLoggingInterceptor } from './request-logging.interceptor';
import { RequestTracingMiddleware } from './request-tracing.middleware';
import { StructuredLoggerService } from './structured-logger.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    AuditTrailService,
    EntityVersioningService,
    RequestContextService,
    RequestLoggingInterceptor,
    RequestTracingMiddleware,
    StructuredLoggerService,
  ],
  exports: [
    AuditTrailService,
    EntityVersioningService,
    RequestContextService,
    RequestLoggingInterceptor,
    StructuredLoggerService,
  ],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestTracingMiddleware).forRoutes({
      path: '*path',
      method: RequestMethod.ALL,
    });
  }
}
