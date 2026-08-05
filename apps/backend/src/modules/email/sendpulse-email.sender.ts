import { Inject, Injectable, Optional, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import sendpulse = require('sendpulse-api');
import type { AppEnvironment } from '../../config/env.schema';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import type { EmailSender, EmailSenderPayload } from './email.types';

interface SendPulseResult {
  is_error?: number;
  message?: string;
  error_code?: number | string;
  result?: boolean;
  [key: string]: unknown;
}

interface SendPulseClient {
  init(
    userId: string,
    secret: string,
    storage: string,
    callback: (result: string | SendPulseResult) => void,
  ): void;
  smtpSendMail(
    callback: (result: SendPulseResult) => void,
    email: Record<string, unknown>,
  ): void;
}

export const SENDPULSE_CLIENT = 'SENDPULSE_CLIENT';

@Injectable()
export class SendPulseEmailSender implements EmailSender {
  private initializedConfigKey?: string;
  private initializationPromise?: Promise<void>;

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<AppEnvironment>,
    @Inject(StructuredLoggerService)
    private readonly logger: StructuredLoggerService,
    @Optional()
    @Inject(SENDPULSE_CLIENT)
    private readonly sendpulseClient: SendPulseClient = sendpulse,
  ) {}

  async send(payload: EmailSenderPayload): Promise<void> {
    const enabled = this.configService.get('SENDPULSE_ENABLED', { infer: true });
    const nodeEnv = this.configService.get('NODE_ENV', { infer: true });
    const apiUserId = this.configService.get('SENDPULSE_API_USER_ID', { infer: true });
    const apiSecret = this.configService.get('SENDPULSE_API_SECRET', { infer: true });

    if (!enabled || nodeEnv === 'test') {
      this.logger.debug('email.send.skipped', {
        provider: 'sendpulse',
        reason: enabled ? 'test_environment' : 'disabled',
        templateSubject: payload.subject,
        recipientFingerprint: this.fingerprint(payload.to.email),
      });
      return;
    }

    const missingConfig = [
      !apiUserId ? 'SENDPULSE_API_USER_ID' : null,
      !apiSecret ? 'SENDPULSE_API_SECRET' : null,
    ].filter((value): value is string => value !== null);

    if (missingConfig.length > 0) {
      this.logger.warn('email.send.configuration_missing', {
        provider: 'sendpulse',
        missing: missingConfig,
      });
      throw new ServiceUnavailableException({
        code: 'EMAIL_PROVIDER_NOT_CONFIGURED',
        message: 'Email provider is not configured.',
      });
    }

    const resolvedApiUserId = this.requireConfigValue(apiUserId);
    const resolvedApiSecret = this.requireConfigValue(apiSecret);
    const fromEmail = this.configService.get('SENDPULSE_FROM_EMAIL', { infer: true });
    const fromName = this.configService.get('SENDPULSE_FROM_NAME', { infer: true });
    const recipientFingerprint = this.fingerprint(payload.to.email);

    try {
      await this.initializeClient(resolvedApiUserId, resolvedApiSecret);
      await this.sendEmail({
        html: payload.html,
        text: payload.text,
        subject: payload.subject,
        from: {
          name: fromName,
          email: fromEmail,
        },
        to: [
          {
            name: payload.to.name ?? payload.to.email,
            email: payload.to.email,
          },
        ],
      }, recipientFingerprint);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.error('email.send.failed', {
        provider: 'sendpulse',
        stage: 'send',
        recipientFingerprint,
      }, error);
      throw new ServiceUnavailableException({
        code: 'EMAIL_SEND_FAILED',
        message: 'Email could not be sent.',
      });
    }

    this.logger.log('email.send.succeeded', {
      provider: 'sendpulse',
      recipientFingerprint,
    });
  }

  private async initializeClient(userId: string, secret: string) {
    const tokenStorage =
      this.configService.get('SENDPULSE_TOKEN_STORAGE', { infer: true }) ??
      '.sendpulse-tokens';
    const configKey = `${userId}::${secret}::${tokenStorage}`;

    if (this.initializationPromise && this.initializedConfigKey === configKey) {
      return this.initializationPromise;
    }

    this.initializedConfigKey = configKey;
    this.initializationPromise = new Promise<void>((resolve, reject) => {
      this.sendpulseClient.init(userId, secret, tokenStorage, (result) => {
        if (this.isErrorResult(result)) {
          const providerErrorDetails = {
            provider: 'sendpulse',
            stage: 'auth',
            providerResponse: result,
          };

          this.logger.error('email.send.initialization_failed', providerErrorDetails);
          reject(this.createSendFailure(providerErrorDetails, 'Email provider authentication failed.'));
          return;
        }

        resolve();
      });
    });

    return this.initializationPromise;
  }

  private async sendEmail(
    email: Record<string, unknown>,
    recipientFingerprint: string,
  ) {
    return new Promise<void>((resolve, reject) => {
      this.sendpulseClient.smtpSendMail((result) => {
        if (this.isErrorResult(result)) {
          reject(this.createSendFailure({
            provider: 'sendpulse',
            stage: 'send',
            recipientFingerprint,
            providerResponse: result,
          }, 'SendPulse API request failed.'));
          return;
        }

        resolve();
      }, email);
    });
  }

  private isErrorResult(result: unknown): result is SendPulseResult {
    return (
      typeof result === 'object' &&
      result !== null &&
      'is_error' in result &&
      result.is_error === 1
    );
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

  private requireConfigValue(value: string | undefined) {
    if (value === undefined) {
      throw new ServiceUnavailableException({
        code: 'EMAIL_PROVIDER_NOT_CONFIGURED',
        message: 'Email provider is not configured.',
      });
    }

    return value;
  }
}
