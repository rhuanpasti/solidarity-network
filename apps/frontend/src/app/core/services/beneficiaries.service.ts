import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  Address,
  BeneficiaryListQuery,
  BeneficiarySummary,
  CreateBeneficiaryResult,
  PaginatedResponse,
} from '@solidarity-network/shared';
import { environment } from '../../../environments/environment';
import { SKIP_GLOBAL_ERROR_TOAST } from '../interceptors/error-toast.token';

export interface BeneficiaryPayload {
  fullName: string;
  document: string;
  birthDate?: string | null;
  email: string;
  phone: string;
  address: Address;
  notes?: string | null;
  charityProgramId: string;
  status: 'active' | 'inactive' | 'archived';
}

export interface BeneficiaryAddressLookupResponse extends Partial<Address> {}

@Injectable({ providedIn: 'root' })
export class BeneficiariesService {
  private readonly httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/beneficiaries`;

  list(query: BeneficiaryListQuery = {}) {
    let params = new HttpParams().set('pageSize', '100');

    Object.entries(query).forEach(([key, value]) => {
      if (value) {
        params = params.set(key, String(value));
      }
    });

    return this.httpClient.get<PaginatedResponse<BeneficiarySummary>>(this.baseUrl, { params });
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
