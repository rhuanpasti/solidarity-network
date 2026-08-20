import { ServiceUnavailableException } from '@nestjs/common';
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { BrevoEmailSender } from './brevo-email.sender';

function makeConfig(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    BREVO_ENABLED: true,
    NODE_ENV: 'production',
    BREVO_API_KEY: 'test-api-key',
    BREVO_FROM_EMAIL: 'no-reply@example.org',
    BREVO_FROM_NAME: 'Solidarity Network',
    ...overrides,
  };

  return {
    get: mock.fn((key: string) => values[key]),
  };
}

function makeResponse(body: unknown, status = 201) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => typeof body === 'string' ? body : JSON.stringify(body),
  };
}

function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    to: {
      email: 'maria@example.org',
      name: 'Maria Silva',
    },
    subject: 'Subject',
    html: '<p>Hello</p>',
    text: 'Hello',
    ...overrides,
  };
}

describe('BrevoEmailSender', () => {
  it('sends the expected Brevo transactional email payload', async () => {
    const config = makeConfig();
    const logger = {
      debug: mock.fn(),
      warn: mock.fn(),
      log: mock.fn(),
      error: mock.fn(),
    };
    const fetchImplementation = mock.fn(async () => makeResponse({
      messageId: '<message-id@example.org>',
    }));
    const sender = new BrevoEmailSender(
      config as never,
      logger as never,
      fetchImplementation as never,
    );

    await sender.send(makePayload());

    assert.equal(fetchImplementation.mock.callCount(), 1);
    const [url, request] = fetchImplementation.mock.calls[0]?.arguments ?? [];
    assert.equal(url, 'https://api.brevo.com/v3/smtp/email');
    assert.deepEqual(request, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': 'test-api-key',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          email: 'no-reply@example.org',
          name: 'Solidarity Network',
        },
        to: [
          {
            email: 'maria@example.org',
            name: 'Maria Silva',
          },
        ],
        subject: 'Subject',
        htmlContent: '<p>Hello</p>',
        textContent: 'Hello',
      }),
    });
  });

  it('throws and logs when Brevo returns an error', async () => {
    const config = makeConfig();
    const logger = {
      debug: mock.fn(),
      warn: mock.fn(),
      log: mock.fn(),
      error: mock.fn(),
    };
    const fetchImplementation = mock.fn(async () => makeResponse({
      code: 'invalid_parameter',
      message: 'provider failed',
    }, 400));
    const sender = new BrevoEmailSender(
      config as never,
      logger as never,
      fetchImplementation as never,
    );

    await assert.rejects(
      () => sender.send(makePayload()),
      (error: unknown) => {
        assert.ok(error instanceof ServiceUnavailableException);
        assert.deepEqual(error.getResponse(), {
          code: 'EMAIL_SEND_FAILED',
          message: 'Email could not be sent.',
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
    assert.deepEqual(logger.error.mock.calls[0]?.arguments[1].providerResponse, {
      code: 'invalid_parameter',
      message: 'provider failed',
    });
  });

  it('throws a configuration error when the API key is missing', async () => {
    const config = makeConfig({ BREVO_API_KEY: undefined });
    const logger = {
      debug: mock.fn(),
      warn: mock.fn(),
      log: mock.fn(),
      error: mock.fn(),
    };
    const fetchImplementation = mock.fn(async () => makeResponse({}));
    const sender = new BrevoEmailSender(
      config as never,
      logger as never,
      fetchImplementation as never,
    );

    await assert.rejects(
      () => sender.send(makePayload()),
      (error: unknown) => {
        assert.ok(error instanceof ServiceUnavailableException);
        assert.deepEqual(error.getResponse(), {
          code: 'EMAIL_PROVIDER_NOT_CONFIGURED',
          message: 'Email provider is not configured.',
        });
        return true;
      },
    );
    assert.equal(fetchImplementation.mock.callCount(), 0);
  });

  it('skips sending in test environments', async () => {
    const config = makeConfig({ NODE_ENV: 'test' });
    const logger = {
      debug: mock.fn(),
      warn: mock.fn(),
      log: mock.fn(),
      error: mock.fn(),
    };
    const fetchImplementation = mock.fn(async () => makeResponse({}));
    const sender = new BrevoEmailSender(
      config as never,
      logger as never,
      fetchImplementation as never,
    );

    await sender.send(makePayload({ isDemo: true }));

    assert.equal(fetchImplementation.mock.callCount(), 0);
    assert.equal(logger.debug.mock.callCount(), 1);
  });

  it('skips sending when demo mode is enabled even if Brevo is configured', async () => {
    const config = makeConfig({ DEMO_MODE: true });
    const logger = {
      debug: mock.fn(),
      warn: mock.fn(),
      log: mock.fn(),
      error: mock.fn(),
    };
    const fetchImplementation = mock.fn(async () => makeResponse({}));
    const sender = new BrevoEmailSender(
      config as never,
      logger as never,
      fetchImplementation as never,
    );

    await sender.send(makePayload({ isDemo: true }));

    assert.equal(fetchImplementation.mock.callCount(), 0);
    assert.equal(logger.debug.mock.calls[0]?.arguments[1].reason, 'demo_mode');
  });

  it('sends real-user email while demo mode is enabled', async () => {
    const config = makeConfig({ DEMO_MODE: true });
    const logger = {
      debug: mock.fn(),
      warn: mock.fn(),
      log: mock.fn(),
      error: mock.fn(),
    };
    const fetchImplementation = mock.fn(async () => makeResponse({}));
    const sender = new BrevoEmailSender(
      config as never,
      logger as never,
      fetchImplementation as never,
    );

    await sender.send(makePayload({ isDemo: false }));

    assert.equal(fetchImplementation.mock.callCount(), 1);
  });
});
