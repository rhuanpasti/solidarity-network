import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { timeout } from 'rxjs';
import type { LoginMetricsResponse } from '@solidarity-network/shared';
import { environment } from '../../../environments/environment';
import { SKIP_GLOBAL_ERROR_TOAST } from '../interceptors/error-toast.token';

@Injectable({ providedIn: 'root' })
export class LoginMetricsService {
  private readonly httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/public/login-metrics`;

  get() {
    return this.httpClient
      .get<LoginMetricsResponse>(this.baseUrl, {
        context: new HttpContext().set(SKIP_GLOBAL_ERROR_TOAST, true),
      })
      .pipe(timeout({ first: 10_000 }));
  }
}
