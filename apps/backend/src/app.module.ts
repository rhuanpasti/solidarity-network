import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { resolve } from 'node:path';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { validateEnv } from './config/env.schema';
import { PrismaModule } from './prisma/prisma.module';
import { AuthGuard } from './modules/auth/auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { AuthorizationGuard } from './modules/authorization/authorization.guard';
import { CharityProgramsModule } from './modules/charity-programs/charity-programs.module';
import { AdministratorsModule } from './modules/administrators/administrators.module';
import { BeneficiariesModule } from './modules/beneficiaries/beneficiaries.module';
import { BenefitsModule } from './modules/benefits/benefits.module';
import { BenefitDeliveriesModule } from './modules/benefit-deliveries/benefit-deliveries.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { RequestLoggingInterceptor } from './modules/observability/request-logging.interceptor';
import { PublicModule } from './modules/public/public.module';
import { DemoModule } from './modules/demo/demo.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), 'apps/backend/.env'),
        resolve(process.cwd(), '.env'),
      ],
      validate: validateEnv,
    }),
    PrismaModule,
    ObservabilityModule,
    AuthModule,
    AuthorizationModule,
    CharityProgramsModule,
    AdministratorsModule,
    BeneficiariesModule,
    BenefitsModule,
    BenefitDeliveriesModule,
    PublicModule,
    DemoModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthorizationGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
