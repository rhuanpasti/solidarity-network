import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BeneficiaryDependentRelationship } from '@solidarity-network/shared';
import {
  getBeneficiaryDependentsValidationErrors,
  normalizeBeneficiaryDependents,
} from './beneficiary-dependents.validation';

describe('beneficiary dependents validation', () => {
  it('normalizes blank dependent documents to null', () => {
    const [dependent] = normalizeBeneficiaryDependents([
      {
        fullName: ' Julia Souza ',
        relationship: BeneficiaryDependentRelationship.Child,
        document: '   ',
        birthDate: '2015-04-25',
      },
    ]);

    assert.equal(dependent?.fullName, 'Julia Souza');
    assert.equal(dependent?.document, null);
  });

  it('accepts dependents under 18 years old', () => {
    const dependents = normalizeBeneficiaryDependents([
      {
        fullName: 'Julia Souza',
        relationship: BeneficiaryDependentRelationship.Child,
        document: null,
        birthDate: '2008-04-26',
      },
    ]);

    assert.deepEqual(
      getBeneficiaryDependentsValidationErrors(
        dependents,
        new Date('2026-04-25T12:00:00.000Z'),
      ),
      [],
    );
  });

  it('rejects dependents who are 18 or older', () => {
    const dependents = normalizeBeneficiaryDependents([
      {
        fullName: 'Pedro Souza',
        relationship: BeneficiaryDependentRelationship.Grandchild,
        document: '123',
        birthDate: '2008-04-25',
      },
    ]);

    assert.deepEqual(
      getBeneficiaryDependentsValidationErrors(
        dependents,
        new Date('2026-04-25T12:00:00.000Z'),
      ),
      ['Dependent 1 must be under 18 years old.'],
    );
  });
});
