import { Inject, Injectable } from '@nestjs/common';
import { EMAIL_SENDER } from './email.tokens';
import { EmailTemplateService } from './email-template.service';
import type { EmailMessage, EmailSender } from './email.types';

@Injectable()
export class EmailService {
  constructor(
    @Inject(EmailTemplateService)
    private readonly templateService: EmailTemplateService,
    @Inject(EMAIL_SENDER)
    private readonly emailSender: EmailSender,
  ) {}

  async send(message: EmailMessage) {
    const renderedEmail = this.templateService.render(
      message.template,
      message.variables,
    );

    await this.emailSender.send({
      to: message.to,
      subject: renderedEmail.subject,
      html: renderedEmail.html,
      text: renderedEmail.text,
      ...(message.isDemo ? { isDemo: true } : {}),
    });
  }
}
