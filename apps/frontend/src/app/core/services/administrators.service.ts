import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  AdministratorSummary,
  CreateAdministratorResult,
  ListQuery,
  PaginatedResponse,
} from '@solidarity-network/shared';
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

  list(searchOrQuery: string | ListQuery = '') {
    const query =
      typeof searchOrQuery === 'string' ? ({ search: searchOrQuery } satisfies ListQuery) : searchOrQuery;
    let params = new HttpParams();

    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.httpClient.get<PaginatedResponse<AdministratorSummary>>(this.baseUrl, { params });
  }

  create(payload: AdministratorPayload) {
    return this.httpClient.post<CreateAdministratorResult>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<AdministratorPayload>) {
    return this.httpClient.patch<AdministratorSummary>(`${this.baseUrl}/${id}`, payload);
  }
}
