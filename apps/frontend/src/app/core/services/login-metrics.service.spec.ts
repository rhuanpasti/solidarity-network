import { HttpClient, HttpContext } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_GLOBAL_ERROR_TOAST } from '../interceptors/error-toast.token';
import { LoginMetricsService } from './login-metrics.service';

describe('LoginMetricsService', () => {
  it('marks optional metrics requests to skip global error toasts', () => {
    const get = mock.fn(() =>
      of({ programs: 1, beneficiaries: 2, deliveries: 3 }),
    );
    const injector = Injector.create({
      providers: [
        LoginMetricsService,
        { provide: HttpClient, useValue: { get } },
      ],
    });
    const service = runInInjectionContext(
      injector,
      () => new LoginMetricsService(),
    );

    service.get().subscribe();

    const [, options] = get.mock.calls[0]!.arguments as [
      string,
      { context: HttpContext },
    ];
    assert.equal(get.mock.calls[0]?.arguments[0], `${environment.apiBaseUrl}/public/login-metrics`);
    assert.equal(options.context.get(SKIP_GLOBAL_ERROR_TOAST), true);
  });
});
