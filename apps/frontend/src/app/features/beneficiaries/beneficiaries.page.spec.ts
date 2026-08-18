import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { BeneficiariesPage } from './beneficiaries.page';

describe('BeneficiariesPage', () => {
  it('closes the editor after a successful save callback', () => {
    const closeEditorDialog = mock.fn();
    const submit = mock.fn((onSuccess?: () => void) => onSuccess?.());
    const page = Object.create(BeneficiariesPage.prototype) as BeneficiariesPage;

    Object.defineProperty(page, 'beneficiariesState', {
      value: { submit },
    });
    Object.defineProperty(page, 'closeEditorDialog', {
      value: closeEditorDialog,
    });

    page.submitBeneficiary();

    assert.equal(submit.mock.callCount(), 1);
    assert.equal(closeEditorDialog.mock.callCount(), 1);
  });
});
