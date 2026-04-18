import type { ActivatedRoute, ParamMap, Router } from '@angular/router';

export function readNumberQueryParam(
  params: ParamMap,
  key: string,
  fallback: number,
) {
  return Number(params.get(key) ?? fallback) || fallback;
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
  return value || null;
}
