import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  AdministratorSummary,
  CreateAdministratorResult,
  ListQuery,
  PaginatedResponse,
} from '@solidarity-network/shared';
import { environment } from '../../../environments/environment';
import { buildHttpParams } from '../../shared/utils/http.utils';

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
    const params = buildHttpParams(query);

    return this.httpClient.get<PaginatedResponse<AdministratorSummary>>(this.baseUrl, { params });
  }

  create(payload: AdministratorPayload) {
    return this.httpClient.post<CreateAdministratorResult>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<AdministratorPayload>) {
    return this.httpClient.patch<AdministratorSummary>(`${this.baseUrl}/${id}`, payload);
  }
}
