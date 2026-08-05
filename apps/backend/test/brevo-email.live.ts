import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateEnv, type AppEnvironment } from '../src/config/env.schema';
import { EmailService } from '../src/modules/email/email.service';
import { EmailTemplateService } from '../src/modules/email/email-template.service';
import { StructuredLoggerService } from '../src/modules/observability/structured-logger.service';
import { BrevoEmailSender } from '../src/modules/email/brevo-email.sender';

function findRepositoryRoot() {
  const candidates = [
    process.cwd(),
    resolve(process.cwd(), '..', '..'),
    resolve(process.cwd(), '..', '..', '..'),
  ];

  const repositoryRoot = candidates.find((candidate) =>
    existsSync(resolve(candidate, 'apps/backend/.env')),
  );

  if (!repositoryRoot) {
    throw new Error('Could not locate apps/backend/.env from the current directory.');
  }

  return repositoryRoot;
}

function serializeError(error: unknown): unknown {
  if (!(error instanceof Error)) {
    return error;
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause: 'cause' in error ? serializeError(error.cause) : undefined,
  };
}

async function main() {
  const recipientEmail = process.argv[2] ?? process.env.BREVO_TEST_RECIPIENT;
  const recipientName = process.argv[3] ?? 'Solidarity Network test recipient';

  if (!recipientEmail) {
    throw new Error(
      'Usage: npm run email:test -- recipient@example.com [Recipient Name]',
    );
  }

  const repositoryRoot = findRepositoryRoot();
  const app = await NestFactory.createApplicationContext(
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(repositoryRoot, 'apps/backend/.env'),
        resolve(repositoryRoot, '.env'),
      ],
      validate: validateEnv,
    }),
    { logger: ['log', 'error', 'warn', 'debug', 'verbose'] },
  );

  try {
    const config = app.get(ConfigService<AppEnvironment>);
    const enabled = config.get('BREVO_ENABLED', { infer: true });
    const apiKey = config.get('BREVO_API_KEY', { infer: true });
    const fromEmail = config.get('BREVO_FROM_EMAIL', { infer: true });
    const fromName = config.get('BREVO_FROM_NAME', { infer: true });

    console.log('[email-test] configuration', {
      enabled,
      nodeEnv: config.get('NODE_ENV', { infer: true }),
      apiKeyConfigured: Boolean(apiKey),
      fromEmail,
      fromName,
      recipient: recipientEmail,
    });

    if (!enabled) {
      throw new Error('BREVO_ENABLED is not true in the loaded environment.');
    }

    const sender = new BrevoEmailSender(
      config,
      new StructuredLoggerService(),
    );
    const emailService = new EmailService(
      new EmailTemplateService(),
      sender,
    );

    console.log('[email-test] sending test email');
    await emailService.send({
      to: {
        email: recipientEmail,
        name: recipientName,
      },
      template: 'new-delivery-notification',
      variables: {
        userName: recipientName,
        deliveryTitle: 'Brevo integration test',
        deliveryType: 'Email delivery test',
        deliveryDate: new Date(),
        programName: 'Solidarity Network',
        organizationName: 'Solidarity Network',
      },
    });

    console.log('[email-test] Brevo accepted the message.');
  } catch (error) {
    console.error('[email-test] failed', serializeError(error));
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void main().catch((error) => {
  console.error('[email-test] fatal', serializeError(error));
  process.exitCode = 1;
});
