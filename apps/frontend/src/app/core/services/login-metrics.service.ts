import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { LoginMetricsResponse } from '@solidarity-network/shared';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LoginMetricsService {
  private readonly httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/public/login-metrics`;

  get() {
    return this.httpClient.get<LoginMetricsResponse>(this.baseUrl);
  }
}
