import type { PaginationMeta } from '@solidarity-network/shared';

export const DEFAULT_PAGE_SIZE = 10;

export const DEFAULT_PAGINATION_META: PaginationMeta = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
};
