import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { BenefitSummary, ListQuery, PaginatedResponse } from '@solidarity-network/shared';
import { environment } from '../../../environments/environment';
import { buildHttpParams } from '../../shared/utils/http.utils';

export interface BenefitPayload {
  name: string;
  description: string;
  category: 'food' | 'hygiene' | 'financial' | 'education' | 'clothing' | 'medicine' | 'other';
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class BenefitsService {
  private readonly httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/benefits`;

  list(searchOrQuery: string | ListQuery = '') {
    const query =
      typeof searchOrQuery === 'string' ? ({ search: searchOrQuery } satisfies ListQuery) : searchOrQuery;
    const params = buildHttpParams(query);

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
