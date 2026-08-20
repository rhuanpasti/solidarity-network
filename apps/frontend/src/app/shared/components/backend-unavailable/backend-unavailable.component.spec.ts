import { Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { LanguageService } from '../../../core/i18n/language.service';
import { BackendAvailabilityService } from '../../../core/services/backend-availability.service';
import { BackendUnavailableComponent } from './backend-unavailable.component';

describe('BackendUnavailableComponent', () => {
  it('clears the error and navigates to login in offline mode', () => {
    const navigate = mock.fn(async () => true);
    const injector = Injector.create({
      providers: [
        BackendAvailabilityService,
        {
          provide: TranslateService,
          useValue: { use: mock.fn() },
        },
        {
          provide: LanguageService,
          useValue: {
            currentLanguage: () => 'en',
            setLanguage: mock.fn(),
          },
        },
        { provide: Router, useValue: { navigate } },
      ],
    });
    const service = injector.get(BackendAvailabilityService);
    service.markUnavailable();

    const component = runInInjectionContext(
      injector,
      () => new BackendUnavailableComponent(),
    );
    component.goToLogin();

    assert.equal(service.isUnavailable(), false);
    assert.deepEqual(navigate.mock.calls[0]?.arguments, [
      ['/login'],
      { queryParams: { offline: 'true' } },
    ]);
  });

  it('delegates language changes to the shared language service', () => {
    const setLanguage = mock.fn();
    const injector = Injector.create({
      providers: [
        BackendAvailabilityService,
        {
          provide: LanguageService,
          useValue: {
            currentLanguage: () => 'en',
            setLanguage,
          },
        },
        { provide: Router, useValue: { navigate: mock.fn() } },
      ],
    });

    const component = runInInjectionContext(
      injector,
      () => new BackendUnavailableComponent(),
    );
    component.setLanguage('pt-br');

    assert.deepEqual(setLanguage.mock.calls[0]?.arguments, ['pt-br']);
  });
});
