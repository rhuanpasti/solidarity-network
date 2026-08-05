import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { EmailService } from './email.service';
import { EmailTemplateService } from './email-template.service';

describe('EmailService', () => {
  it('renders the selected template and calls the configured sender', async () => {
    const sender = { send: mock.fn() };
    const service = new EmailService(new EmailTemplateService(), sender);

    await service.send({
      to: {
        email: 'maria@example.org',
        name: 'Maria Silva',
      },
      template: 'temporary-password',
      variables: {
        userName: 'Maria Silva',
        email: 'maria@example.org',
        temporaryPassword: '1234567890123456',
        organizationName: 'Solidarity Network',
      },
    });

    assert.equal(sender.send.mock.callCount(), 1);
    const payload = sender.send.mock.calls[0]?.arguments[0];
    assert.equal(payload.to.email, 'maria@example.org');
    assert.equal(payload.subject, 'Seu acesso a Rede Solidaria esta pronto');
    assert.match(payload.html, /1234567890123456/);
    assert.match(payload.text, /altere esta senha depois do login/);
  });
});
