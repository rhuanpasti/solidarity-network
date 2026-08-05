import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { of, Subject } from 'rxjs';
import { CachedListStore, createListCacheKey } from './cached-list.store';

describe('CachedListStore', () => {
  afterEach(() => {
    mock.timers.reset();
  });

  it('reuses a loaded response when the same query is ensured again', () => {
    const store = new CachedListStore(0);
    let calls = 0;
    const key = createListCacheKey({ page: 1, pageSize: 10 });

    store.ensure(key, () => {
      calls += 1;
      return of(['first']);
    });
    store.ensure(key, () => {
      calls += 1;
      return of(['second']);
    });

    assert.equal(calls, 1);
    assert.deepEqual(store.state(key).data, ['first']);
  });

  it('deduplicates requests that are already in flight', () => {
    const store = new CachedListStore(0);
    const request = new Subject<string[]>();
    const key = 'default';
    let calls = 0;

    store.ensure(key, () => {
      calls += 1;
      return request.asObservable();
    });
    store.ensure(key, () => {
      calls += 1;
      return request.asObservable();
    });

    assert.equal(calls, 1);
    assert.equal(store.state(key).loading, true);

    request.next(['loaded']);
    request.complete();

    assert.deepEqual(store.state(key).data, ['loaded']);
    assert.equal(store.state(key).loading, false);
  });

  it('keeps existing data during refresh and invalidates after a mutation', () => {
    const store = new CachedListStore(0);
    const key = 'default';

    store.ensure(key, () => of(['old']));
    assert.equal(store.refresh(key, () => of(['new'])), true);
    assert.deepEqual(store.state(key).data, ['new']);
    assert.equal(store.state(key).refreshing, false);

    store.invalidate(key);
    assert.equal(store.state(key).data, null);
    assert.equal(store.state(key).lastLoadedAt, null);
  });

  it('blocks manual refresh during the cooldown window', () => {
    mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    const store = new CachedListStore(1000);
    const key = 'default';
    let calls = 0;

    store.ensure(key, () => {
      calls += 1;
      return of(['loaded']);
    });

    assert.equal(store.refresh(key, () => {
      calls += 1;
      return of(['refreshed']);
    }), false);
    assert.equal(calls, 1);

    mock.timers.tick(1000);

    assert.equal(store.refresh(key, () => {
      calls += 1;
      return of(['refreshed']);
    }), true);
    assert.equal(calls, 2);
  });
});
