import { signal } from '@angular/core';
import { EMPTY, Observable, of } from 'rxjs';
import { catchError, finalize, shareReplay, tap } from 'rxjs/operators';

export interface CachedListState<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: unknown | null;
  lastLoadedAt: number | null;
  nextRefreshAt: number | null;
}

const EMPTY_STATE = <T>(): CachedListState<T> => ({
  data: null,
  loading: false,
  refreshing: false,
  error: null,
  lastLoadedAt: null,
  nextRefreshAt: null,
});

export function createListCacheKey(query: object = {}) {
  return JSON.stringify(
    Object.entries(query)
      .filter(([, value]) => value !== undefined && value !== '')
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

export class CachedListStore<T> {
  private readonly states = signal<Record<string, CachedListState<T>>>({});
  private readonly inFlight = new Map<string, Observable<T>>();
  private readonly refreshTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private readonly refreshCooldownMs = 30_000) {}

  state(key: string): CachedListState<T> {
    return this.states()[key] ?? EMPTY_STATE<T>();
  }

  ensure(key: string, loader: () => Observable<T>) {
    const current = this.state(key);

    if (current.data !== null || current.loading || current.refreshing) {
      return;
    }

    this.load(key, loader)?.subscribe();
  }

  refresh(key: string, loader: () => Observable<T>) {
    const current = this.state(key);

    if (current.loading || current.refreshing) {
      return false;
    }

    if (current.nextRefreshAt !== null && current.nextRefreshAt > Date.now()) {
      return false;
    }

    this.load(key, loader)?.subscribe();
    return true;
  }

  getOrLoad(key: string, loader: () => Observable<T>) {
    const current = this.state(key);
    if (current.data !== null) {
      return of(current.data);
    }

    const currentRequest = this.inFlight.get(key);
    if (currentRequest) {
      return currentRequest;
    }

    return this.load(key, loader) ?? EMPTY;
  }

  invalidate(key: string) {
    const timer = this.refreshTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.refreshTimers.delete(key);
    }

    this.states.update((states) => ({
      ...states,
      [key]: EMPTY_STATE<T>(),
    }));
  }

  private load(key: string, loader: () => Observable<T>) {
    const currentRequest = this.inFlight.get(key);
    if (currentRequest) {
      return currentRequest;
    }

    const hasData = this.state(key).data !== null;
    this.states.update((states) => ({
      ...states,
      [key]: {
        ...this.state(key),
        loading: !hasData,
        refreshing: hasData,
        error: null,
      },
    }));

    const request = loader().pipe(
      tap((data) => {
        const nextRefreshAt = Date.now() + this.refreshCooldownMs;
        this.states.update((states) => ({
          ...states,
          [key]: {
            data,
            loading: false,
            refreshing: false,
            error: null,
            lastLoadedAt: Date.now(),
            nextRefreshAt,
          },
        }));
        this.scheduleRefreshUnlock(key, nextRefreshAt);
      }),
      catchError((error: unknown) => {
        this.states.update((states) => ({
          ...states,
          [key]: {
            ...this.state(key),
            loading: false,
            refreshing: false,
            error,
          },
        }));
        return EMPTY;
      }),
      finalize(() => this.inFlight.delete(key)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.inFlight.set(key, request);
    return request;
  }

  private scheduleRefreshUnlock(key: string, nextRefreshAt: number) {
    const currentTimer = this.refreshTimers.get(key);
    if (currentTimer) {
      clearTimeout(currentTimer);
    }

    const tick = () => {
      const current = this.state(key);
      if (current.nextRefreshAt !== nextRefreshAt) {
        this.refreshTimers.delete(key);
        return;
      }

      const remainingMs = nextRefreshAt - Date.now();
      if (remainingMs <= 0) {
        this.refreshTimers.delete(key);
        this.states.update((states) => ({
          ...states,
          [key]: {
            ...current,
            nextRefreshAt: null,
          },
        }));
        return;
      }

      const timer = setTimeout(tick, Math.min(1000, remainingMs));
      this.refreshTimers.set(key, timer);
    };

    const timer = setTimeout(tick, Math.min(1000, this.refreshCooldownMs));
    this.refreshTimers.set(key, timer);
  }
}
