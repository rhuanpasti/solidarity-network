import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { CharityProgramSummary, ListQuery, PaginatedResponse } from '@solidarity-network/shared';
import { environment } from '../../../environments/environment';

export interface CharityProgramPayload {
  name: string;
  description: string;
  status: 'active' | 'inactive';
}

@Injectable({ providedIn: 'root' })
export class CharityProgramsService {
  private readonly httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/charity-programs`;

  list(searchOrQuery: string | ListQuery = '') {
    const query =
      typeof searchOrQuery === 'string' ? ({ search: searchOrQuery } satisfies ListQuery) : searchOrQuery;
    let params = new HttpParams();

    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.httpClient.get<PaginatedResponse<CharityProgramSummary>>(this.baseUrl, { params });
  }

  create(payload: CharityProgramPayload) {
    return this.httpClient.post<CharityProgramSummary>(this.baseUrl, payload);
  }

  update(id: string, payload: CharityProgramPayload) {
    return this.httpClient.patch<CharityProgramSummary>(`${this.baseUrl}/${id}`, payload);
  }

  updateStatus(id: string, status: 'active' | 'inactive') {
    return this.httpClient.patch<CharityProgramSummary>(`${this.baseUrl}/${id}/status`, { status });
  }
}
