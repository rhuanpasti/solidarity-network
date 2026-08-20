import { Inject, Injectable, Optional, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import type { AppEnvironment } from '../../config/env.schema';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import type { EmailSender, EmailSenderPayload } from './email.types';

type BrevoResponse = Record<string, unknown>;

export type BrevoFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export const BREVO_FETCH = 'BREVO_FETCH';

@Injectable()
export class BrevoEmailSender implements EmailSender {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<AppEnvironment>,
    @Inject(StructuredLoggerService)
    private readonly logger: StructuredLoggerService,
    @Optional()
    @Inject(BREVO_FETCH)
    private readonly fetchImplementation: BrevoFetch = fetch,
  ) {}

  async send(payload: EmailSenderPayload): Promise<void> {
    const enabled = this.configService.get('BREVO_ENABLED', { infer: true });
    const nodeEnv = this.configService.get('NODE_ENV', { infer: true });
    const apiKey = this.configService.get('BREVO_API_KEY', { infer: true });
    const fromEmail = this.configService.get('BREVO_FROM_EMAIL', { infer: true });
    const fromName = this.configService.get('BREVO_FROM_NAME', { infer: true });

    if (!enabled || nodeEnv === 'test' || payload.isDemo) {
      this.logger.debug('email.send.skipped', {
        provider: 'brevo',
        reason: payload.isDemo ? 'demo_mode' : enabled ? 'test_environment' : 'disabled',
        templateSubject: payload.subject,
        recipientFingerprint: this.fingerprint(payload.to.email),
      });
      return;
    }

    const missingConfig = [
      !apiKey ? 'BREVO_API_KEY' : null,
      !fromEmail ? 'BREVO_FROM_EMAIL' : null,
    ].filter((value): value is string => value !== null);

    if (missingConfig.length > 0) {
      this.logger.warn('email.send.configuration_missing', {
        provider: 'brevo',
        missing: missingConfig,
      });
      throw new ServiceUnavailableException({
        code: 'EMAIL_PROVIDER_NOT_CONFIGURED',
        message: 'Email provider is not configured.',
      });
    }

    const resolvedApiKey = apiKey as string;
    const resolvedFromEmail = fromEmail as string;
    const recipientFingerprint = this.fingerprint(payload.to.email);

    this.logger.debug('email.send.started', {
      provider: 'brevo',
      subject: payload.subject,
      recipientFingerprint,
      fromEmail,
    });

    try {
      const response = await this.fetchImplementation('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': resolvedApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            email: resolvedFromEmail,
            ...(fromName ? { name: fromName } : {}),
          },
          to: [
            {
              email: payload.to.email,
              ...(payload.to.name ? { name: payload.to.name } : {}),
            },
          ],
          subject: payload.subject,
          htmlContent: payload.html,
          textContent: payload.text,
        }),
      });

      const providerResponse = await this.readResponse(response);
      this.logger.debug('email.send.provider_response', {
        provider: 'brevo',
        stage: 'send',
        status: response.status,
        recipientFingerprint,
        providerResponse,
      });

      if (!response.ok) {
        throw this.createSendFailure({
          provider: 'brevo',
          stage: 'send',
          status: response.status,
          recipientFingerprint,
          providerResponse,
        }, 'Brevo API request failed.');
      }
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.error('email.send.failed', {
        provider: 'brevo',
        stage: 'send',
        recipientFingerprint,
      }, error);
      throw new ServiceUnavailableException({
        code: 'EMAIL_SEND_FAILED',
        message: 'Email could not be sent.',
      }, {
        cause: error,
      });
    }

    this.logger.log('email.send.succeeded', {
      provider: 'brevo',
      recipientFingerprint,
    });
  }

  private async readResponse(response: Response): Promise<BrevoResponse | string> {
    const text = await response.text();

    if (!text) {
      return '';
    }

    try {
      return JSON.parse(text) as BrevoResponse;
    } catch {
      return text;
    }
  }

  private createSendFailure(
    providerErrorDetails: Record<string, unknown>,
    message: string,
  ) {
    this.logger.error('email.send.failed', providerErrorDetails);

    return new ServiceUnavailableException({
      code: 'EMAIL_SEND_FAILED',
      message: 'Email could not be sent.',
    }, {
      cause: new Error(message, {
        cause: providerErrorDetails,
      }),
    });
  }

  private fingerprint(email: string) {
    return createHash('sha256')
      .update(email.trim().toLowerCase())
      .digest('hex')
      .slice(0, 16);
  }
}
