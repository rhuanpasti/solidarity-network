import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { BenefitSummary, PaginatedResponse } from '@solidarity-network/shared';
import { environment } from '../../../environments/environment';

export interface BenefitPayload {
  name: string;
  description: string;
  category: 'food' | 'hygiene' | 'financial' | 'education' | 'clothing' | 'medicine' | 'other';
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class BenefitsApi {
  private readonly httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/benefits`;

  list(search = '') {
    let params = new HttpParams().set('pageSize', '100');
    if (search) {
      params = params.set('search', search);
    }
    return this.httpClient.get<PaginatedResponse<BenefitSummary>>(this.baseUrl, { params });
  }

  create(payload: BenefitPayload) {
    return this.httpClient.post<BenefitSummary>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<BenefitPayload>) {
    return this.httpClient.patch<BenefitSummary>(`${this.baseUrl}/${id}`, payload);
  }

  updateStatus(id: string, active: boolean) {
    return this.httpClient.patch<BenefitSummary>(`${this.baseUrl}/${id}/status`, { active });
  }
}
