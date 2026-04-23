import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BRAZIL_COUNTRY, WORLD_COUNTRY, type Address } from '@solidarity-network/shared';
import {
  getBeneficiaryValidationErrors,
  normalizeBeneficiaryInput,
} from './beneficiary-validation';

const brazilianAddress: Address = {
  street: 'Rua Um',
  number: '10',
  district: 'Centro',
  city: 'Sao Paulo',
  state: 'SP',
  postalCode: '01001000',
  country: BRAZIL_COUNTRY,
};

describe('beneficiary validation', () => {
  it('normalizes Brazilian CPF, postal code, and country casing', () => {
    const normalized = normalizeBeneficiaryInput({
      document: '529.982.247-25',
      phone: ' (11) 91234-5678 ',
      address: { ...brazilianAddress, country: ' brazil ' as never },
    });

    assert.equal(normalized.document, '52998224725');
    assert.equal(normalized.phone, '(11) 91234-5678');
    assert.equal(normalized.address.postalCode, '01001-000');
    assert.equal(normalized.address.country, BRAZIL_COUNTRY);
  });

  it('returns all Brazil-specific validation errors', () => {
    assert.deepEqual(
      getBeneficiaryValidationErrors({
        document: '111.111.111-11',
        phone: '123',
        address: { ...brazilianAddress, postalCode: '999' },
      }),
      [
        'Invalid CPF for a beneficiary with country Brazil.',
        'Invalid phone number for a beneficiary with country Brazil.',
        'Invalid postal code for a beneficiary with country Brazil.',
      ],
    );
  });

  it('does not apply Brazil CPF/phone/postal-code rules to world addresses', () => {
    assert.deepEqual(
      getBeneficiaryValidationErrors({
        document: 'foreign-passport',
        phone: 'abc',
        address: { ...brazilianAddress, postalCode: 'not-a-cep', country: WORLD_COUNTRY },
      }),
      [],
    );
  });
});
