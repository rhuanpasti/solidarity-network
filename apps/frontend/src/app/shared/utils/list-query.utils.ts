import type { ActivatedRoute, ParamMap, Router } from '@angular/router';

export function readNumberQueryParam(
  params: ParamMap,
  key: string,
  fallback: number,
) {
  const raw = params.get(key);

  if (raw === null || raw.trim() === '') {
    return fallback;
  }

  const value = Number(raw);

  return Number.isSafeInteger(value) && value >= 1 ? value : fallback;
}

export function navigateWithMergedQuery(
  router: Router,
  route: ActivatedRoute,
  queryParams: Record<string, unknown>,
) {
  return router.navigate([], {
    relativeTo: route,
    queryParams,
    queryParamsHandling: 'merge',
  });
}

export function normalizeEmptyQueryValue<T>(value: T | '' | null | undefined) {
  return value === '' || value === null || value === undefined ? null : value;
}
