import { Module } from '@nestjs/common';
import { EMAIL_SENDER } from './email.tokens';
import { EmailService } from './email.service';
import { EmailTemplateService } from './email-template.service';
import { BrevoEmailSender } from './brevo-email.sender';
import { DemoModule } from '../demo/demo.module';

@Module({
  imports: [DemoModule],
  providers: [
    EmailService,
    EmailTemplateService,
    BrevoEmailSender,
    {
      provide: EMAIL_SENDER,
      useExisting: BrevoEmailSender,
    },
  ],
  exports: [EmailService, EmailTemplateService, EMAIL_SENDER],
})
export class EmailModule {}
