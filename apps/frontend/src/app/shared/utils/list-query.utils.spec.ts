import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { convertToParamMap } from '@angular/router';
import {
  normalizeEmptyQueryValue,
  readNumberQueryParam,
  navigateWithMergedQuery,
} from './list-query.utils';

describe('list query utilities', () => {
  it('reads numeric query params and falls back for missing, empty, or invalid values', () => {
    assert.equal(readNumberQueryParam(convertToParamMap({ page: '3' }), 'page', 1), 3);
    assert.equal(readNumberQueryParam(convertToParamMap({ page: '' }), 'page', 1), 1);
    assert.equal(readNumberQueryParam(convertToParamMap({ page: 'abc' }), 'page', 2), 2);
    assert.equal(readNumberQueryParam(convertToParamMap({ page: '-1' }), 'page', 1), 1);
    assert.equal(readNumberQueryParam(convertToParamMap({ page: '1.5' }), 'page', 1), 1);
    assert.equal(readNumberQueryParam(convertToParamMap({ page: 'Infinity' }), 'page', 1), 1);
    assert.equal(
      readNumberQueryParam(
        convertToParamMap({ page: String(Number.MAX_SAFE_INTEGER + 1) }),
        'page',
        1,
      ),
      1,
    );
    assert.equal(readNumberQueryParam(convertToParamMap({}), 'page', 5), 5);
  });

  it('normalizes empty query values to null while preserving other falsy values', () => {
    assert.equal(normalizeEmptyQueryValue(''), null);
    assert.equal(normalizeEmptyQueryValue(null), null);
    assert.equal(normalizeEmptyQueryValue(undefined), null);
    assert.equal(normalizeEmptyQueryValue(0), 0);
    assert.equal(normalizeEmptyQueryValue(false), false);
    assert.equal(normalizeEmptyQueryValue('active'), 'active');
  });

  it('navigates with merged query params relative to the current route', async () => {
    const calls: unknown[] = [];
    const route = { snapshot: {} };
    const router = {
      navigate: async (...args: unknown[]) => {
        calls.push(args);
        return true;
      },
    };

    assert.equal(
      await navigateWithMergedQuery(router as never, route as never, { page: 2 }),
      true,
    );
    assert.deepEqual(calls, [
      [
        [],
        {
          relativeTo: route,
          queryParams: { page: 2 },
          queryParamsHandling: 'merge',
        },
      ],
    ]);
  });
});
