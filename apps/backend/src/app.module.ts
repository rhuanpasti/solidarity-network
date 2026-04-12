import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { resolve } from 'node:path';
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
import { PublicModule } from './modules/public/public.module';

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
    AuthModule,
    AuthorizationModule,
    CharityProgramsModule,
    AdministratorsModule,
    BeneficiariesModule,
    BenefitsModule,
    BenefitDeliveriesModule,
    PublicModule,
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
  ],
})
export class AppModule {}
