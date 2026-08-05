import { BadRequestException, Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  EmailTemplateName,
  EmailTemplateVariables,
  RenderedEmail,
} from './email.types';

type TemplateDefinition = {
  subject: string;
  requiredVariables: string[];
  htmlFile: string;
  textFile: string;
};

const templates: Record<EmailTemplateName, TemplateDefinition> = {
  'forgot-password': {
    subject: 'Redefina sua senha na Rede Solidaria',
    requiredVariables: ['userName', 'email', 'resetPasswordLink', 'expiresIn'],
    htmlFile: 'forgot-password.html',
    textFile: 'forgot-password.txt',
  },
  'temporary-password': {
    subject: 'Seu acesso a Rede Solidaria esta pronto',
    requiredVariables: ['userName', 'email', 'temporaryPassword', 'organizationName'],
    htmlFile: 'temporary-password.html',
    textFile: 'temporary-password.txt',
  },
  'new-delivery-notification': {
    subject: 'Nova entrega registrada em {{programName}}',
    requiredVariables: [
      'userName',
      'deliveryTitle',
      'deliveryType',
      'deliveryDate',
      'programName',
      'organizationName',
    ],
    htmlFile: 'new-delivery-notification.html',
    textFile: 'new-delivery-notification.txt',
  },
};

@Injectable()
export class EmailTemplateService {
  private readonly templateRoot = join(__dirname, 'templates');
  private readonly templateCache = new Map<string, string>();

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

    const subject = this.interpolate(
      template.subject,
      variables,
      false,
    );
    const content = this.interpolate(
      this.readTemplate(template.htmlFile),
      variables,
      true,
    );
    const text = this.interpolate(
      this.readTemplate(template.textFile),
      variables,
      false,
    );

    return {
      subject,
      html: this.applyLayout(content, subject),
      text,
    };
  }

  private readTemplate(fileName: string) {
    const cachedTemplate = this.templateCache.get(fileName);

    if (cachedTemplate !== undefined) {
      return cachedTemplate;
    }

    const template = readFileSync(join(this.templateRoot, fileName), 'utf8').trim();
    this.templateCache.set(fileName, template);
    return template;
  }

  private applyLayout(content: string, preheader: string) {
    return this.readTemplate('layout.html')
      .replaceAll('{{preheader}}', this.escape(preheader))
      .replaceAll('{{content}}', content);
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
}
