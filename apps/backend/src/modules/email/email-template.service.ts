import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  EmailTemplateName,
  EmailTemplateVariables,
  RenderedEmail,
} from './email.types';

type TemplateDefinition = {
  subject: string;
  requiredVariables: string[];
  html: string;
  text: string;
};

const templates: Record<EmailTemplateName, TemplateDefinition> = {
  'forgot-password': {
    subject: 'Reset your Solidarity Network password',
    requiredVariables: ['userName', 'email', 'resetPasswordLink', 'expiresIn'],
    html: `
      <p>Hello {{userName}},</p>
      <p>We received a request to reset the password for {{email}}.</p>
      <p><a href="{{resetPasswordLink}}">Reset your password</a></p>
      <p>This link expires in {{expiresIn}}. If you did not request this, you can ignore this email.</p>
      <p>We will never ask for your current password.</p>
    `,
    text: [
      'Hello {{userName}},',
      '',
      'We received a request to reset the password for {{email}}.',
      'Reset your password: {{resetPasswordLink}}',
      'This link expires in {{expiresIn}}. If you did not request this, you can ignore this email.',
      'We will never ask for your current password.',
    ].join('\n'),
  },
  'temporary-password': {
    subject: 'Your temporary Solidarity Network password',
    requiredVariables: ['userName', 'email', 'temporaryPassword', 'organizationName'],
    html: `
      <p>Hello {{userName}},</p>
      <p>An account was created for you in {{organizationName}}.</p>
      <p>Your temporary password is:</p>
      <p><strong>{{temporaryPassword}}</strong></p>
      <p>Sign in with {{email}} and change this password after login.</p>
    `,
    text: [
      'Hello {{userName}},',
      '',
      'An account was created for you in {{organizationName}}.',
      'Temporary password: {{temporaryPassword}}',
      'Sign in with {{email}} and change this password after login.',
    ].join('\n'),
  },
  'new-delivery-notification': {
    subject: 'New delivery registered in {{programName}}',
    requiredVariables: [
      'userName',
      'deliveryTitle',
      'deliveryType',
      'deliveryDate',
      'programName',
      'organizationName',
    ],
    html: `
      <p>Hello {{userName}},</p>
      <p>A new delivery was registered for you by {{organizationName}}.</p>
      <p><strong>{{deliveryTitle}}</strong></p>
      <p>Type: {{deliveryType}}<br>Date: {{deliveryDate}}<br>Program: {{programName}}</p>
      <p>Please review your portal or contact the program team if you need help.</p>
    `,
    text: [
      'Hello {{userName}},',
      '',
      'A new delivery was registered for you by {{organizationName}}.',
      'Delivery: {{deliveryTitle}}',
      'Type: {{deliveryType}}',
      'Date: {{deliveryDate}}',
      'Program: {{programName}}',
      'Please review your portal or contact the program team if you need help.',
    ].join('\n'),
  },
};

@Injectable()
export class EmailTemplateService {
  render(
    templateName: EmailTemplateName,
    variables: EmailTemplateVariables,
  ): RenderedEmail {
    const template = templates[templateName];
    const missingVariables = template.requiredVariables.filter(
      (variable) => variables[variable] === undefined || variables[variable] === '',
    );

    if (missingVariables.length > 0) {
      throw new BadRequestException({
        code: 'EMAIL_TEMPLATE_VARIABLES_MISSING',
        message: 'Email template variables are missing.',
        details: {
          template: templateName,
          missingVariables,
        },
      });
    }

    return {
      subject: this.interpolate(template.subject, variables, false),
      html: this.wrapHtml(this.interpolate(template.html, variables, true)),
      text: this.interpolate(template.text, variables, false),
    };
  }

  private interpolate(
    template: string,
    variables: EmailTemplateVariables,
    escapeHtml: boolean,
  ) {
    return template.replaceAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) =>
      escapeHtml
        ? this.escape(String(this.formatValue(variables[key])))
        : String(this.formatValue(variables[key])),
    );
  }

  private formatValue(value: string | number | Date | undefined) {
    if (value instanceof Date) {
      return value.toISOString();
    }

    return value ?? '';
  }

  private escape(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  private wrapHtml(body: string) {
    return `<!doctype html>
<html>
  <body style="font-family: Arial, sans-serif; color: #1f2933; line-height: 1.5;">
    <div style="max-width: 640px; margin: 0 auto; padding: 24px;">
      ${body}
    </div>
  </body>
</html>`;
  }
}
