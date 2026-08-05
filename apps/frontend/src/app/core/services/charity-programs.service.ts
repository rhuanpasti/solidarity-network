import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  CharityProgramListQuery,
  CharityProgramSummary,
  PaginatedResponse,
} from '@solidarity-network/shared';
import { environment } from '../../../environments/environment';
import { buildHttpParams } from '../../shared/utils/http.utils';
import {
  CachedListStore,
  createListCacheKey,
} from '../state/cached-list.store';

export interface CharityProgramPayload {
  name: string;
  description: string;
  status: 'active' | 'inactive';
}

@Injectable({ providedIn: 'root' })
export class CharityProgramsService {
  private readonly httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/charity-programs`;
  private readonly listCache = new CachedListStore<PaginatedResponse<CharityProgramSummary>>();

  list(searchOrQuery: string | CharityProgramListQuery = '') {
    const query =
      typeof searchOrQuery === 'string'
        ? ({ search: searchOrQuery } satisfies CharityProgramListQuery)
        : searchOrQuery;
    const params = buildHttpParams(query);

    return this.httpClient.get<PaginatedResponse<CharityProgramSummary>>(this.baseUrl, { params });
  }

  listState(query: CharityProgramListQuery | string = '') {
    const normalizedQuery = typeof query === 'string' ? { search: query } : query;
    return this.listCache.state(createListCacheKey(normalizedQuery));
  }

  ensureList(query: CharityProgramListQuery = {}) {
    const key = createListCacheKey(query);
    this.listCache.ensure(key, () => this.list(query));
  }

  refreshList(query: CharityProgramListQuery = {}) {
    const key = createListCacheKey(query);
    return this.listCache.refresh(key, () => this.list(query));
  }

  invalidateList(query: CharityProgramListQuery = {}) {
    this.listCache.invalidate(createListCacheKey(query));
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
