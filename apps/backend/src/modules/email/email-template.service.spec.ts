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

    assert.equal(result.subject, 'Redefina sua senha na Rede Solidaria');
    assert.match(result.html, /Rede Solidaria/);
    assert.match(result.html, /role="presentation"/);
    assert.match(result.html, /background:#f3f4f6/);
    assert.match(result.html, /background:#16a34a/);
    assert.match(result.html, /Redefina sua senha/);
    assert.match(result.html, /https:\/\/app\.example\.org\/reset\?token=secret-token/);
    assert.match(result.text, /Este link expira em 1 hour/);
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
