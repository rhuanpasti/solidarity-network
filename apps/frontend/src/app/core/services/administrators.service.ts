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
import {
  CachedListStore,
  createListCacheKey,
} from '../state/cached-list.store';

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
  private readonly listCache = new CachedListStore<PaginatedResponse<AdministratorSummary>>();

  list(searchOrQuery: string | ListQuery = '') {
    const query =
      typeof searchOrQuery === 'string' ? ({ search: searchOrQuery } satisfies ListQuery) : searchOrQuery;
    const params = buildHttpParams(query);

    return this.httpClient.get<PaginatedResponse<AdministratorSummary>>(this.baseUrl, { params });
  }

  listState(query: ListQuery = {}) {
    return this.listCache.state(createListCacheKey(query));
  }

  ensureList(query: ListQuery = {}) {
    const key = createListCacheKey(query);
    this.listCache.ensure(key, () => this.list(query));
  }

  refreshList(query: ListQuery = {}) {
    const key = createListCacheKey(query);
    return this.listCache.refresh(key, () => this.list(query));
  }

  invalidateList(query: ListQuery = {}) {
    this.listCache.invalidate(createListCacheKey(query));
  }

  create(payload: AdministratorPayload) {
    return this.httpClient.post<CreateAdministratorResult>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<AdministratorPayload>) {
    return this.httpClient.patch<AdministratorSummary>(`${this.baseUrl}/${id}`, payload);
  }

  resendTemporaryAccess(id: string) {
    return this.httpClient.post<{ success: boolean }>(`${this.baseUrl}/${id}/resend-access`, {});
  }
}
