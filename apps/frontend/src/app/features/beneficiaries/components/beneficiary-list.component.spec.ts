import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BeneficiaryListComponent } from './beneficiary-list.component';

describe('BeneficiaryListComponent', () => {
  it('does not expose a document formatter for list rows', () => {
    assert.equal('formatDocument' in BeneficiaryListComponent.prototype, false);
  });
});
