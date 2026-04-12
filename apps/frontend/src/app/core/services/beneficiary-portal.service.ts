import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { BeneficiaryPortalSummary } from '@solidarity-network/shared';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BeneficiaryPortalService {
  private readonly httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/beneficiary-portal`;

  getMine() {
    return this.httpClient.get<BeneficiaryPortalSummary>(`${this.baseUrl}/me`);
  }
}
