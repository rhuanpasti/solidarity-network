import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildBeneficiarySearchFilters } from './beneficiary-search.util';

describe('beneficiary search filters', () => {
  it('matches CPF values with or without punctuation', () => {
    const filters = buildBeneficiarySearchFilters('12345678900');

    assert.equal(filters.length, 4);
    assert.deepEqual(filters.slice(2), [
      { document: { contains: '12345678900', mode: 'insensitive' } },
      { document: { contains: '123.456.789-00', mode: 'insensitive' } },
    ]);
  });

  it('keeps formatted CPF searches intact', () => {
    const filters = buildBeneficiarySearchFilters('123.456.789-00');
    assert.ok(
      filters.some(
        (filter) =>
          'document' in filter &&
          filter.document?.contains === '123.456.789-00',
      ),
    );
  });
});
