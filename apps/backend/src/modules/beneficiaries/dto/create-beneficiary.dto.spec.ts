import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BRAZIL_COUNTRY } from '@solidarity-network/shared';
import { CreateBeneficiaryDto } from './create-beneficiary.dto';

const validPayload = {
  fullName: 'Ana Souza',
  document: '52998224725',
  birthDate: '1991-02-14',
  phone: '+55 11 96540-1101',
  address: {
    street: 'Rua das Palmeiras',
    number: '145',
    district: 'Centro',
    city: 'Sao Paulo',
    state: 'SP',
    postalCode: '01001-000',
    country: BRAZIL_COUNTRY,
  },
};

describe('CreateBeneficiaryDto', () => {
  it('accepts a beneficiary without an email address', async () => {
    const errors = await validate(plainToInstance(CreateBeneficiaryDto, validPayload));

    assert.deepEqual(errors, []);
  });

  it('still rejects a malformed optional email address', async () => {
    const errors = await validate(
      plainToInstance(CreateBeneficiaryDto, {
        ...validPayload,
        email: 'not-an-email',
      }),
    );

    assert.equal(errors.some((error) => error.property === 'email'), true);
  });
});
