import { HttpRequest, HttpResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { of, throwError } from 'rxjs';
import { loadingInterceptor } from './loading.interceptor';
import { LoadingService } from '../services/loading.service';

describe('loadingInterceptor', () => {
  beforeEach(() => {
    Object.assign(globalThis, { window: globalThis });
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it('starts loading before the request and ends it after success', () => {
    const injector = Injector.create({ providers: [LoadingService] });
    const loadingService = injector.get(LoadingService);
    const request = new HttpRequest('GET', '/api/example');

    const response$ = runInInjectionContext(injector, () =>
      loadingInterceptor(request, () => of(new HttpResponse({ status: 200 }))),
    );

    assert.equal(loadingService.isLoading(), true);
    response$.subscribe();
    assert.equal(loadingService.isLoading(), false);
  });

  it('ends loading when the request errors', () => {
    const injector = Injector.create({ providers: [LoadingService] });
    const loadingService = injector.get(LoadingService);
    const request = new HttpRequest('GET', '/api/example');

    const response$ = runInInjectionContext(injector, () =>
      loadingInterceptor(request, () => throwError(() => new Error('failed'))),
    );

    assert.equal(loadingService.isLoading(), true);
    response$.subscribe({ error: () => undefined });
    assert.equal(loadingService.isLoading(), false);
  });
});
