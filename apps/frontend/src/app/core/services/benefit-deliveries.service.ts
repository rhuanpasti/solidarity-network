import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  BenefitDeliveryListQuery,
  BenefitDeliverySummary,
  PaginatedResponse,
} from '@solidarity-network/shared';
import { environment } from '../../../environments/environment';

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

  list(query: BenefitDeliveryListQuery = {}) {
    let params = new HttpParams().set('pageSize', '100');

    Object.entries(query).forEach(([key, value]) => {
      if (value) {
        params = params.set(key, String(value));
      }
    });

    return this.httpClient.get<PaginatedResponse<BenefitDeliverySummary>>(this.baseUrl, { params });
  }

  create(payload: BenefitDeliveryPayload) {
    return this.httpClient.post<BenefitDeliverySummary>(this.baseUrl, payload);
  }
}
