import { HttpParams } from '@angular/common/http';

export function buildHttpParams<T extends object>(query: T) {
  let params = new HttpParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, String(value));
    }
  });

  return params;
}
