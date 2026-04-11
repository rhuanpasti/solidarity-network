import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { AdministratorSummary, PaginatedResponse } from '@solidarity-network/shared';
import { environment } from '../../../environments/environment';

export interface AdministratorPayload {
  name: string;
  email: string;
  phone: string;
  role: 'super_admin' | 'program_manager' | 'case_worker';
  charityProgramIds: string[];
}

@Injectable({ providedIn: 'root' })
export class AdministratorsService {
  private readonly httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/administrators`;

  list(search = '') {
    let params = new HttpParams().set('pageSize', '100');
    if (search) {
      params = params.set('search', search);
    }
    return this.httpClient.get<PaginatedResponse<AdministratorSummary>>(this.baseUrl, { params });
  }

  create(payload: AdministratorPayload) {
    return this.httpClient.post<AdministratorSummary>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<AdministratorPayload>) {
    return this.httpClient.patch<AdministratorSummary>(`${this.baseUrl}/${id}`, payload);
  }
}
