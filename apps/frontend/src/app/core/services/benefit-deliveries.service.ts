import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  BenefitDeliveryListQuery,
  BenefitDeliverySummary,
  PaginatedResponse,
} from '@solidarity-network/shared';
import { environment } from '../../../environments/environment';
import { buildHttpParams } from '../../shared/utils/http.utils';
import {
  CachedListStore,
  createListCacheKey,
} from '../state/cached-list.store';

export interface BenefitDeliveryPayload {
  beneficiaryId: string;
  benefitId: string;
  charityProgramId: string;
  quantity: number;
  deliveryDate: string;
  notes?: string | null;
  reference: string;
}

@Injectable({ providedIn: 'root' })
export class BenefitDeliveriesService {
  private readonly httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/benefit-deliveries`;
  private readonly listCache = new CachedListStore<PaginatedResponse<BenefitDeliverySummary>>();

  list(query: BenefitDeliveryListQuery = {}) {
    const params = buildHttpParams(query);

    return this.httpClient.get<PaginatedResponse<BenefitDeliverySummary>>(this.baseUrl, { params });
  }

  listState(query: BenefitDeliveryListQuery = {}) {
    return this.listCache.state(createListCacheKey(query));
  }

  ensureList(query: BenefitDeliveryListQuery = {}) {
    const key = createListCacheKey(query);
    this.listCache.ensure(key, () => this.list(query));
  }

  refreshList(query: BenefitDeliveryListQuery = {}) {
    const key = createListCacheKey(query);
    return this.listCache.refresh(key, () => this.list(query));
  }

  invalidateList(query: BenefitDeliveryListQuery = {}) {
    this.listCache.invalidate(createListCacheKey(query));
  }

  create(payload: BenefitDeliveryPayload) {
    return this.httpClient.post<BenefitDeliverySummary>(this.baseUrl, payload);
  }
}
