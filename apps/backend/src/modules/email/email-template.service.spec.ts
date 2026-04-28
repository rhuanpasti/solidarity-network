import { BadRequestException } from '@nestjs/common';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EmailTemplateService } from './email-template.service';

describe('EmailTemplateService', () => {
  it('selects and renders the forgot password template', () => {
    const service = new EmailTemplateService();

    const result = service.render('forgot-password', {
      userName: 'Maria Silva',
      email: 'maria@example.org',
      resetPasswordLink: 'https://app.example.org/reset?token=secret-token',
      expiresIn: '1 hour',
    });

    assert.equal(result.subject, 'Reset your Solidarity Network password');
    assert.match(result.html, /Reset your password/);
    assert.match(result.html, /https:\/\/app\.example\.org\/reset\?token=secret-token/);
    assert.match(result.text, /This link expires in 1 hour/);
  });

  it('requires dynamic variables for the selected template', () => {
    const service = new EmailTemplateService();

    assert.throws(
      () =>
        service.render('temporary-password', {
          userName: 'Maria Silva',
          email: 'maria@example.org',
          organizationName: 'Solidarity Network',
        }),
      BadRequestException,
    );
  });
});

