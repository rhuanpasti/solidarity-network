import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  BenefitDeliveryListQuery,
  BenefitDeliverySummary,
  PaginatedResponse,
} from '@solidarity-network/shared';
import { environment } from '../../../environments/environment';
import { buildHttpParams } from '../../shared/utils/http.utils';

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
    const params = buildHttpParams(query);

    return this.httpClient.get<PaginatedResponse<BenefitDeliverySummary>>(this.baseUrl, { params });
  }

  create(payload: BenefitDeliveryPayload) {
    return this.httpClient.post<BenefitDeliverySummary>(this.baseUrl, payload);
  }
}
