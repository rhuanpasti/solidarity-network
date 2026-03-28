import type { PaginatedResponse, PaginationMeta } from '@solidarity-network/shared';

export function createPaginatedResponse<TItem>(
  items: TItem[],
  page: number,
  pageSize: number,
  totalItems: number,
): PaginatedResponse<TItem> {
  const meta: PaginationMeta = {
    page,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize) || 1,
  };

  return {
    items,
    meta,
  };
}

