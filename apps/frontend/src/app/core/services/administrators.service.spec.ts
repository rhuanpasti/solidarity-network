import '@angular/compiler';
import { HttpClient } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdministratorsService } from './administrators.service';

describe('AdministratorsService', () => {
  it('posts a request to resend temporary administrator access', () => {
    const post = mock.fn(() => of({ success: true }));
    const injector = Injector.create({
      providers: [
        AdministratorsService,
        { provide: HttpClient, useValue: { post } },
      ],
    });
    const service = runInInjectionContext(injector, () => new AdministratorsService());

    service.resendTemporaryAccess('admin-target').subscribe((result) => {
      assert.deepEqual(result, { success: true });
    });

    assert.equal(post.mock.callCount(), 1);
    assert.deepEqual(post.mock.calls[0]?.arguments, [
      `${environment.apiBaseUrl}/administrators/admin-target/resend-access`,
      {},
    ]);
  });
});
