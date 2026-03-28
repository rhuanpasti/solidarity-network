import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.schema';
import { PrismaModule } from './prisma/prisma.module';
import { CharityProgramsModule } from './modules/charity-programs/charity-programs.module';
import { AdministratorsModule } from './modules/administrators/administrators.module';
import { BeneficiariesModule } from './modules/beneficiaries/beneficiaries.module';
import { BenefitsModule } from './modules/benefits/benefits.module';
import { BenefitDeliveriesModule } from './modules/benefit-deliveries/benefit-deliveries.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    CharityProgramsModule,
    AdministratorsModule,
    BeneficiariesModule,
    BenefitsModule,
    BenefitDeliveriesModule,
  ],
})
export class AppModule {}

