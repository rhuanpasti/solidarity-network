export type EmailTemplateName =
  | 'forgot-password'
  | 'temporary-password'
  | 'new-delivery-notification';

export type EmailTemplateVariables = Record<string, string | number | Date>;

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface EmailMessage {
  to: EmailRecipient;
  template: EmailTemplateName;
  variables: EmailTemplateVariables;
}

export interface EmailSenderPayload {
  to: EmailRecipient;
  subject: string;
  html: string;
  text: string;
}

export interface EmailSender {
  send(payload: EmailSenderPayload): Promise<void>;
}

