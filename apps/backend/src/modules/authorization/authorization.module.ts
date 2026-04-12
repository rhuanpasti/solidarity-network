import { Global, Module } from '@nestjs/common';
import { AuthorizationGuard } from './authorization.guard';
import { AuthorizationService } from './authorization.service';

@Global()
@Module({
  providers: [AuthorizationGuard, AuthorizationService],
  exports: [AuthorizationGuard, AuthorizationService],
})
export class AuthorizationModule {}

