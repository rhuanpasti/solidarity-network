import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  CharityProgramListQuery,
  CharityProgramSummary,
  PaginatedResponse,
} from '@solidarity-network/shared';
import { environment } from '../../../environments/environment';
import { buildHttpParams } from '../../shared/utils/http.utils';

export interface CharityProgramPayload {
  name: string;
  description: string;
  status: 'active' | 'inactive';
}

@Injectable({ providedIn: 'root' })
export class CharityProgramsService {
  private readonly httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/charity-programs`;

  list(searchOrQuery: string | CharityProgramListQuery = '') {
    const query =
      typeof searchOrQuery === 'string'
        ? ({ search: searchOrQuery } satisfies CharityProgramListQuery)
        : searchOrQuery;
    const params = buildHttpParams(query);

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
