export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResponse<TItem> {
  items: TItem[];
  meta: PaginationMeta;
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface BeneficiaryListQuery extends ListQuery {
  charityProgramId?: string;
  status?: string;
}

export interface BenefitDeliveryListQuery extends ListQuery {
  beneficiaryId?: string;
  charityProgramId?: string;
}

export interface ApiValidationErrorDetail {
  field: string;
  code: string;
  message: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  path: string;
}

export interface LoginMetricsResponse {
  programs: number;
  beneficiaries: number;
  deliveries: number;
}
