import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  Address,
  BeneficiaryDependentRelationship,
  BeneficiaryListQuery,
  BeneficiarySummary,
  CreateBeneficiaryResult,
  PaginatedResponse,
} from '@solidarity-network/shared';
import { environment } from '../../../environments/environment';
import { SKIP_GLOBAL_ERROR_TOAST } from '../interceptors/error-toast.token';
import { buildHttpParams } from '../../shared/utils/http.utils';
import {
  CachedListStore,
  createListCacheKey,
} from '../state/cached-list.store';

export interface BeneficiaryPayload {
  fullName: string;
  document: string;
  birthDate: string;
  email: string;
  phone: string;
  address: Address;
  notes?: string | null;
  dependents?: BeneficiaryDependentPayload[];
  charityProgramIds?: string[];
  status: 'active' | 'inactive' | 'archived';
}

export interface BeneficiaryDependentPayload {
  fullName: string;
  relationship: BeneficiaryDependentRelationship;
  document?: string | null;
  birthDate: string;
}

export type BeneficiaryAddressLookupResponse = Partial<Address>;

@Injectable({ providedIn: 'root' })
export class BeneficiariesService {
  private readonly httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/beneficiaries`;
  private readonly listCache = new CachedListStore<PaginatedResponse<BeneficiarySummary>>();

  list(query: BeneficiaryListQuery = {}) {
    const params = buildHttpParams(query);

    return this.httpClient.get<PaginatedResponse<BeneficiarySummary>>(this.baseUrl, { params });
  }

  listState(query: BeneficiaryListQuery = {}) {
    return this.listCache.state(createListCacheKey(query));
  }

  listCached(query: BeneficiaryListQuery = {}) {
    const key = createListCacheKey(query);
    return this.listCache.getOrLoad(key, () => this.list(query));
  }

  ensureList(query: BeneficiaryListQuery = {}) {
    const key = createListCacheKey(query);
    this.listCache.ensure(key, () => this.list(query));
  }

  refreshList(query: BeneficiaryListQuery = {}) {
    const key = createListCacheKey(query);
    return this.listCache.refresh(key, () => this.list(query));
  }

  invalidateList(query: BeneficiaryListQuery = {}) {
    this.listCache.invalidate(createListCacheKey(query));
  }

  create(payload: BeneficiaryPayload) {
    return this.httpClient.post<CreateBeneficiaryResult>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<BeneficiaryPayload>) {
    return this.httpClient.patch<BeneficiarySummary>(`${this.baseUrl}/${id}`, payload);
  }

  lookupAddress(postalCode: string) {
    const params = new HttpParams().set('postalCode', postalCode);
    return this.httpClient.get<BeneficiaryAddressLookupResponse>(`${this.baseUrl}/address-lookup`, {
      params,
      context: new HttpContext().set(SKIP_GLOBAL_ERROR_TOAST, true),
    });
  }
}
