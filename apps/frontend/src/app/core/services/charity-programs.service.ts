import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { CharityProgramSummary, PaginatedResponse } from '@solidarity-network/shared';
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

  list(search = '') {
    let params = new HttpParams().set('pageSize', '100');
    if (search) {
      params = params.set('search', search);
    }
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
