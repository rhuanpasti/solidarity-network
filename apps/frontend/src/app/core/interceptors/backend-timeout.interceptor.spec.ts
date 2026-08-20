import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NEVER, TimeoutError, firstValueFrom, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BackendAvailabilityService } from '../services/backend-availability.service';
import { createBackendTimeoutInterceptor } from './backend-timeout.interceptor';

describe('backendTimeoutInterceptor', () => {
  it('marks the backend unavailable when an API request times out', async () => {
    const injector = Injector.create({ providers: [BackendAvailabilityService] });
    const service = injector.get(BackendAvailabilityService);
    const request = new HttpRequest('GET', `${environment.apiBaseUrl}/health`);
    const interceptor = createBackendTimeoutInterceptor(1);

    const response$ = runInInjectionContext(injector, () =>
      interceptor(request, () => NEVER),
    );

    await assert.rejects(
      () => firstValueFrom(response$),
      (error: unknown) => {
        assert.ok(error instanceof TimeoutError);
        return true;
      },
    );

    assert.equal(service.isUnavailable(), true);
  });

  it('marks the backend unavailable when the API connection fails immediately', async () => {
    const injector = Injector.create({ providers: [BackendAvailabilityService] });
    const service = injector.get(BackendAvailabilityService);
    const request = new HttpRequest('GET', `${environment.apiBaseUrl}/health`);
    const response$ = runInInjectionContext(injector, () =>
      createBackendTimeoutInterceptor()(request, () =>
        throwError(() => new HttpErrorResponse({ status: 0, url: request.url })),
      ),
    );

    await assert.rejects(() => firstValueFrom(response$), HttpErrorResponse);

    assert.equal(service.isUnavailable(), true);
  });
});
