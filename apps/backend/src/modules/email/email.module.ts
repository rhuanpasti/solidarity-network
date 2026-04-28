import { Module } from '@nestjs/common';
import { EMAIL_SENDER } from './email.tokens';
import { EmailService } from './email.service';
import { EmailTemplateService } from './email-template.service';
import { SendPulseEmailSender } from './sendpulse-email.sender';

@Module({
  providers: [
    EmailService,
    EmailTemplateService,
    SendPulseEmailSender,
    {
      provide: EMAIL_SENDER,
      useExisting: SendPulseEmailSender,
    },
  ],
  exports: [EmailService, EmailTemplateService, EMAIL_SENDER],
})
export class EmailModule {}

