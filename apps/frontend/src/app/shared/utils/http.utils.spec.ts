import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildHttpParams } from './http.utils';

describe('buildHttpParams', () => {
  it('omits empty values and stringifies valid falsy values', () => {
    const params = buildHttpParams({
      page: 0,
      active: false,
      search: '',
      missing: null,
      notSet: undefined,
      name: 'Food',
    });

    assert.equal(params.toString(), 'page=0&active=false&name=Food');
  });
});
