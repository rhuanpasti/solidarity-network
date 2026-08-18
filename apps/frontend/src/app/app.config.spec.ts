import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CDK_OVERLAY_DEFAULT_CONFIG } from './app.config';

describe('CDK overlay configuration', () => {
  it('keeps overlays out of the native popover top layer', () => {
    assert.equal(CDK_OVERLAY_DEFAULT_CONFIG.usePopover, false);
  });
});
