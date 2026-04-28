import { ServiceUnavailableException } from '@nestjs/common';
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { SendPulseEmailSender } from './sendpulse-email.sender';

function makeConfig(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    SENDPULSE_ENABLED: true,
    NODE_ENV: 'production',
    SENDPULSE_API_USER_ID: 'test-user-id',
    SENDPULSE_API_SECRET: 'test-secret',
    SENDPULSE_TOKEN_STORAGE: '.sendpulse-tests',
    SENDPULSE_FROM_EMAIL: 'no-reply@example.org',
    SENDPULSE_FROM_NAME: 'Solidarity Network',
    ...overrides,
  };

  return {
    get: mock.fn((key: string) => values[key]),
  };
}

function makeClient(overrides: Partial<{
  init: (
    userId: string,
    secret: string,
    storage: string,
    callback: (result: string | Record<string, unknown>) => void,
  ) => void;
  smtpSendMail: (
    callback: (result: Record<string, unknown>) => void,
    email: Record<string, unknown>,
  ) => void;
}> = {}) {
  return {
    init: mock.fn(
      overrides.init ??
        ((_: string, __: string, ___: string, callback: (result: string) => void) => {
          callback('token');
        }),
    ),
    smtpSendMail: mock.fn(
      overrides.smtpSendMail ??
        ((callback: (result: Record<string, unknown>) => void) => {
          callback({ result: true });
        }),
    ),
  };
}

function makePayload() {
  return {
    to: {
      email: 'maria@example.org',
      name: 'Maria Silva',
    },
    subject: 'Subject',
    html: '<p>Hello</p>',
    text: 'Hello',
  };
}

describe('SendPulseEmailSender', () => {
  it('sends the expected SendPulse SMTP API payload', async () => {
    const config = makeConfig();
    const logger = {
      debug: mock.fn(),
      warn: mock.fn(),
      log: mock.fn(),
      error: mock.fn(),
    };
    const client = makeClient();
    const sender = new SendPulseEmailSender(config as never, logger as never, client as never);

    await sender.send(makePayload());

    assert.equal(client.init.mock.callCount(), 1);
    assert.deepEqual(client.init.mock.calls[0]?.arguments.slice(0, 3), [
      'test-user-id',
      'test-secret',
      '.sendpulse-tests',
    ]);
    assert.equal(client.smtpSendMail.mock.callCount(), 1);
    const email = client.smtpSendMail.mock.calls[0]?.arguments[1] as Record<string, unknown>;
    assert.equal(email.subject, 'Subject');
    assert.deepEqual(email.from, {
      name: 'Solidarity Network',
      email: 'no-reply@example.org',
    });
    assert.deepEqual(email.to, [
      {
        name: 'Maria Silva',
        email: 'maria@example.org',
      },
    ]);
    assert.equal(email.html, '<p>Hello</p>');
    assert.equal(email.text, 'Hello');
  });

  it('throws and logs when SendPulse returns an error', async () => {
    const config = makeConfig();
    const logger = {
      debug: mock.fn(),
      warn: mock.fn(),
      log: mock.fn(),
      error: mock.fn(),
    };
    const client = makeClient({
      smtpSendMail: (callback) => {
        callback({
          is_error: 1,
          message: 'provider failed',
          error_code: 500,
        });
      },
    });
    const sender = new SendPulseEmailSender(config as never, logger as never, client as never);

    await assert.rejects(
      () => sender.send(makePayload()),
      (error: unknown) => {
        assert.ok(error instanceof ServiceUnavailableException);
        assert.deepEqual(error.getResponse(), {
          code: 'EMAIL_SEND_FAILED',
          message: 'Email could not be sent.',
          details: {
            provider: 'sendpulse',
            stage: 'send',
            recipientFingerprint: logger.error.mock.calls[0]?.arguments[1].recipientFingerprint,
            providerResponse: {
              is_error: 1,
              message: 'provider failed',
              error_code: 500,
            },
          },
        });
        return true;
      },
    );
    assert.equal(logger.error.mock.callCount(), 1);
    assert.equal(logger.error.mock.calls[0]?.arguments[0], 'email.send.failed');
    assert.equal(
      logger.error.mock.calls[0]?.arguments[1].recipientFingerprint.length,
      16,
    );
  });

  it('skips sending in test environments', async () => {
    const config = makeConfig({ NODE_ENV: 'test' });
    const logger = {
      debug: mock.fn(),
      warn: mock.fn(),
      log: mock.fn(),
      error: mock.fn(),
    };
    const client = makeClient();
    const sender = new SendPulseEmailSender(config as never, logger as never, client as never);

    await sender.send(makePayload());

    assert.equal(client.init.mock.callCount(), 0);
    assert.equal(client.smtpSendMail.mock.callCount(), 0);
    assert.equal(logger.debug.mock.callCount(), 1);
  });
});
