import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MODAL_DIALOG_CONFIG } from './modal.config';

describe('MODAL_DIALOG_CONFIG', () => {
  it('keeps dialogs constrained, accessible, and focus-managed', () => {
    assert.equal(MODAL_DIALOG_CONFIG.ariaLabelledBy, 'modal-title');
    assert.equal(MODAL_DIALOG_CONFIG.autoFocus, 'first-tabbable');
    assert.equal(MODAL_DIALOG_CONFIG.restoreFocus, true);
    assert.equal(MODAL_DIALOG_CONFIG.closeOnNavigation, true);
    assert.match(MODAL_DIALOG_CONFIG.maxHeight, /100vh/);
  });
});
